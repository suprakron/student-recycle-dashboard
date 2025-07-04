<template>
  <div class="dashboard-container">
    <header class="header">
      <img src="../assets/images/logo.jpeg" alt="Logo" class="logo" />
      <h2 class="title">
        <span class="material-symbols-outlined icon">recycling</span>
        ข้อมูลการเก็บขยะและแลกของรางวัล
      </h2>
    </header>

    <section class="filters">
      <input v-model="filters.name" type="text" placeholder="ค้นหาชื่อ..." />
      <select v-model="filters.classLevel">
        <option value="">ทุกชั้น</option>
        <option v-for="cl in classLevels" :key="cl" :value="cl">{{ cl }}</option>
      </select>
      <input type="date" v-model="filters.date" />
    </section>

    <TableSection title="ข้อมูลรวมของนักเรียน">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>รหัสนักเรียน</th>
              <th>ชื่อ-สกุล</th>
              <th>ชั้น</th>
              <th>อีเมล</th>
              <th>เบอร์โทร</th>
              <th>วันสมัคร</th>
              <th>ประเภทขยะล่าสุด</th>
              <th>จำนวน</th>
              <th>แต้มที่ได้</th>
              <th>ของรางวัลล่าสุด</th>
              <th>แต้มที่ใช้</th>
              <th>วันที่แลก</th>
              <th>หลักฐานการทิ้ง</th>
              <th>ชื่อเก่า</th>
              <th>ชื่อใหม่</th>
              <th>วันที่เปลี่ยนชื่อ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id" class="table-row">
              <td>{{ user.studentId || '-' }}</td>
              <td class="name-cell">{{ user.fullName || '-' }}</td>
              <td>{{ user.classLevel || '-' }}</td>
              <td>{{ user.email || '-' }}</td>
              <td>{{ user.phone || '-' }}</td>
            
              <td>{{ formatDate(user.createdAt?.toDate?.() || user.createdAt) }}</td>
              <td>{{ user.lastTrash?.trashType || '-' }}</td>
              <td>{{ user.lastTrash?.amount || '-' }}</td>
              <td>{{ user.lastTrash?.pointsEarned || '-' }}</td>
              <td>{{ user.lastRedemption?.rewardName || '-' }}</td>
              <td>{{ user.lastRedemption?.pointsUsed || '-' }}</td>
              <td>{{ formatDate(user.lastRedemption?.timestamp) }}</td>
              <td>
                <div v-if="user.allTrashImages?.length" class="image-cell">
                  <img
                    :src="user.lastTrash?.imageUrl"
                    alt="หลักฐาน"
                    class="thumbnail"
                    @click="showImage(user.lastTrash.imageUrl)"
                  />
                 
                  <button @click="viewAllTrashImages(user)" class="view-button">
                    ดูทั้งหมด
                  </button>
                </div>
                <span v-else>-</span>
              </td>
              <td>{{ user.lastProfileChange?.oldFullName || '-' }}</td>
              <td>{{ user.lastProfileChange?.newFullName || '-' }}</td>
              <td>{{ formatDate(user.lastProfileChange?.timestamp) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </TableSection>

    <div v-if="showImageModal" class="modal" @click.self="closeImageModal">
      <div class="modal-content">
        <span class="close" @click="closeImageModal">&times;</span>
        <img :src="currentImage" alt="หลักฐานการทิ้ง" />
      </div>
    </div>

   <div v-if="allImagesModalVisible" class="modal">
    <div class="modal-content gallery-modal">
      <span class="close" @click="allImagesModalVisible = false">&times;</span>
      <div class="image-gallery">
        <div
          class="image-card"
          v-for="(img, index) in selectedUserImages"
          :key="index"
        >
          <img
            :src="img"
            class="thumbnail"
            alt="ภาพหลักฐาน"
            @click="showImage(img)"
          />
         
        </div>
      </div>
    </div>
  </div>
  </div>
</template>



<script setup  lang="ts">
import { ref, computed, onMounted } from 'vue'
import { db } from '../firebase/firebase'
import { collection, getDocs, Timestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import TableSection from '../components/TableSection.vue'
import type { StudentData } from '@/types'

const usersList = ref([])
const trashRecords = ref([])
const trashImages = ref([])
const redemptionsList = ref([])
const profileChangesList = ref([])
const filters = ref({ name: '', classLevel: '', date: '' })
const classLevels = ref([])
const showImageModal = ref(false)
const currentImage = ref('')
const allImagesModalVisible = ref(false)
const selectedUserImages = ref([])

const getLatest = (list, dateField = 'date') => {
  if (!list || !list.length) return null
  return [...list].sort((a, b) => new Date(b[dateField]) - new Date(a[dateField]))[0]
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = date instanceof Date ? date : date.toDate?.()
  return format(d, 'yyyy-MM-dd')
}
const extractDateFromImageUrl = (url) => {
  const match = url.match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : '-'
}
const fetchData = async () => {
  const [usersSnap, trashSnap, redemptionsSnap, profileSnap, imagesSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'trash_records')),
    getDocs(collection(db, 'redemptions')),
    getDocs(collection(db, 'profile_changes')),
    getDocs(collection(db, 'trash_images')),
  ])

  usersList.value = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  trashRecords.value = trashSnap.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
    }
  })

  trashImages.value = imagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  redemptionsList.value = redemptionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate?.() }))
  profileChangesList.value = profileSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate?.() }))

  classLevels.value = [...new Set(usersList.value.map(u => u.classLevel).filter(Boolean))]
}

onMounted(fetchData)

const enrichedUsers = computed(() => {
  return usersList.value.map(u => {
    const userTrash = trashRecords.value.filter(t => t.userId === u.authUid)
    const lastTrash = getLatest(userTrash)
    const allTrashImages = userTrash.map(t => t.imageUrl).filter(Boolean)

    trashImages.value.forEach(img => {
      const isOwner = img.userId === u.authUid
      const isRelatedRecord = lastTrash && img.trashRecordId === lastTrash.id
      if ((isOwner || isRelatedRecord) && img.imageUrl) {
        if (!allTrashImages.includes(img.imageUrl)) allTrashImages.push(img.imageUrl)
      }
    })

    const lastRedemption = getLatest(redemptionsList.value.filter(r => r.studentId === u.id), 'timestamp')
    const lastProfileChange = getLatest(profileChangesList.value.filter(p => p.studentId === u.id), 'timestamp')

    return {
      ...u,
      lastTrash,
      lastRedemption,
      lastProfileChange,
      allTrashImages,
    }
  })
})

const filteredUsers = computed(() => {
  return enrichedUsers.value
    .filter(u => u && u.fullName)
    .filter(({ fullName, classLevel, createdAt }) => {
      const nameMatch = (fullName || '').toLowerCase().includes(filters.value.name.toLowerCase())
      const classMatch = !filters.value.classLevel || classLevel === filters.value.classLevel
      const dateMatch = !filters.value.date || formatDate(createdAt) === filters.value.date
      return nameMatch && classMatch && dateMatch
    })
})

const showImage = (url) => {
  currentImage.value = url
  showImageModal.value = true
}

const closeImageModal = () => {
  showImageModal.value = false
  currentImage.value = ''
}

const viewAllTrashImages = (user) => {
  selectedUserImages.value = user.allTrashImages
  allImagesModalVisible.value = true
}
</script>
 
<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;600&display=swap');

.dashboard-container {
  padding: 2rem;
  background: linear-gradient(135deg, #a1c4fd, #c2e9fb);
  font-family: 'Kanit', sans-serif;
  overflow-x: auto;
  min-height: 100vh;
  color: #222;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.logo {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 3px solid #4caf50;
  cursor: pointer;
  transition: filter 0.3s ease;
}
.logo:hover {
  filter: brightness(1.1);
}

.title {
  font-size: 2rem;
  font-weight: 600;
  color: #2e7d32;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  user-select: none;
}

.title .icon {
  font-size: 2.4rem;
  color: #388e3c;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
}

.filters input,
.filters select {
  padding: 12px 16px;
  border-radius: 10px;
  border: none;
  font-size: 1rem;
  min-width: 200px;
  background: white;
  box-shadow: 0 0 0 3px #81c784;
  transition: box-shadow 0.25s ease;
}
.filters input::placeholder {
  color: #a5d6a7;
  font-style: italic;
}
.filters input:focus,
.filters select:focus {
  outline: none;
  box-shadow: 0 0 0 5px #4caf50;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 14px;
  background: white;
  box-shadow: none;
  border: 3px solid #66bb6a;
  transition: border-color 0.3s ease;
}
.table-wrapper:hover {
  border-color: #388e3c;
}

table {
  width: 100%;
  min-width: 1100px;
  border-collapse: collapse;
  table-layout: fixed;
}

thead tr {
  background-color: #43a047;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
}

th {
  padding: 14px 12px;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 10;
  user-select: none;
  border-right: 2px solid #66bb6a;
}

th:last-child {
  border-right: none;
}

tbody tr {
  background: #dcedc8;
  transition: background-color 0.3s ease;
  cursor: default;
}

tbody tr:nth-child(even) {
  background: #e6efdb;
}

tbody tr:hover {
  background-color: #aed581;
  color: #1b5e20;
  font-weight: 600;
}

td {
  padding: 12px 10px;
  text-align: center;
  font-size: 0.95rem;
  overflow-wrap: break-word;
  border-right: 1.5px solid #a5d6a7;
  user-select: text;
}

td:last-child {
  border-right: none;
}

.name-cell {
  font-weight: 700;
  color: #33691e;
  text-align: left;
  padding-left: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.points-cell {
  font-weight: 700;
  color: #2e7d32;
  background: #c8e6c9;
  border-radius: 8px;
}

.image-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.thumbnail {
  max-width: 100px;
  max-height: 100px;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.3s ease;
  border: 3px solid #4caf50;
}
.thumbnail:hover {
  transform: scale(1.1);
  border-color: #1b5e20;
}

.view-button {
  margin-top: 6px;
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  transition: background-color 0.3s ease, transform 0.2s ease;
}
.view-button:hover {
  background-color: #1b5e20;
  transform: scale(1.05);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #a5d6a7cc;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  padding: 1rem 1.2rem;
  border-radius: 14px;
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: none;
  border: 3px solid #4caf50;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.modal-content img {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 12px;
  cursor: zoom-in;
  transition: transform 0.25s ease;
  border: 4px solid #81c784;
}
.modal-content img:hover {
  transform: scale(1.08);
  border-color: #2e7d32;
}

.gallery-modal {
  width: 95vw;
  max-width: 1200px;
}

.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.close {
  position: absolute;
  top: 8px;
  right: 16px;
  font-size: 2.2rem;
  font-weight: 700;
  color: #2e7d32;
  cursor: pointer;
  user-select: none;
  transition: color 0.25s ease;
}
.close:hover {
  color: #1b5e20;
}

.image-url {
  font-size: 0.75rem;
  word-break: break-word;
  color: #2e7d32;
  margin-top: 4px;
  max-width: 110px;
  text-align: center;
  font-style: normal;
}

.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
}

.image-card {
  background: #f0f4c3;
  border-radius: 12px;
  padding: 0.75rem;
  box-shadow: 0 0 0 3px #aed581 inset;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 160px;
  transition: transform 0.25s;
}

.image-card:hover {
  transform: translateY(-6px);
}

.image-card .thumbnail {
  width: 100%;
  height: auto;
  border-radius: 10px;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.image-meta {
  text-align: center;
  font-size: 0.85rem;
  color: #33691e;
}

.image-meta button {
  margin-top: 0.3rem;
  padding: 4px 10px;
  background: #8bc34a;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 0.8rem;
}

.image-meta button:hover {
  background: #558b2f;
}
</style>