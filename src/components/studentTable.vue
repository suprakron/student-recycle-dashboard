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
              <th>แต้มสะสม</th>
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
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>{{ user.studentId || '-' }}</td>
              <td>{{ user.fullName || '-' }}</td>
              <td>{{ user.classLevel || '-' }}</td>
              <td>{{ user.email || '-' }}</td>
              <td>{{ user.phone || '-' }}</td>
              <td>{{ user.points || 0 }}</td>
              <td>{{ formatDate(user.createdAt?.toDate?.() || user.createdAt) }}</td>
              <td>{{ user.lastTrash?.trashType || '-' }}</td>
              <td>{{ user.lastTrash?.amount || '-' }}</td>
              <td>{{ user.lastTrash?.pointsEarned || '-' }}</td>
              <td>{{ user.lastRedemption?.rewardName || '-' }}</td>
              <td>{{ user.lastRedemption?.pointsUsed || '-' }}</td>
              <td>{{ formatDate(user.lastRedemption?.timestamp) }}</td>
              <td>
                <div v-if="user.lastTrash?.imageUrl">
                  <img :src="user.lastTrash.imageUrl" alt="หลักฐาน" class="thumbnail"
                    @click="showImage(user.lastTrash.imageUrl)" />
                  <p style="font-size: 0.8rem; word-break: break-all;">{{ user.lastTrash.imageUrl }}</p>
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

    <div v-if="showImageModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="closeImageModal">&times;</span>
        <img :src="currentImage" alt="หลักฐานการทิ้ง" />
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../firebase/firebase'
import { collection, getDocs, Timestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import TableSection from '../components/TableSection.vue'

const usersList = ref([])
const trashRecords = ref([])
const redemptionsList = ref([])
const profileChangesList = ref([])
const imagesMap = ref({})
const filters = ref({ name: '', classLevel: '', date: '' })
const classLevels = ref([])
const showImageModal = ref(false)
const currentImage = ref('')

// ฟังก์ชันช่วยจัดการวันที่ให้เป็น string
const formatDate = (date) => {
  if (!date) return '-'
  const d = date instanceof Date ? date : date.toDate?.()
  return format(d, 'yyyy-MM-dd')
}

// ดึงข้อมูลจาก Firestore
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

  redemptionsList.value = redemptionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate?.() }))
  profileChangesList.value = profileSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate?.() }))

  imagesSnap.docs.forEach(doc => {
    const d = doc.data()
    imagesMap.value[d.trashRecordId] = d.imageUrl
    console.log('Mapping trashRecordId to imageUrl:', d.trashRecordId, d.imageUrl)
  })


  classLevels.value = [...new Set(usersList.value.map(u => u.classLevel).filter(Boolean))]
}

onMounted(fetchData)

// ฟังก์ชันช่วยดึงข้อมูลล่าสุด
const getLatest = (list, dateField = 'date') => {
  if (!list || !list.length) return null
  return [...list].sort((a, b) => new Date(b[dateField]) - new Date(a[dateField]))[0]
}

// รวมข้อมูลผู้ใช้แต่ละคน
// const enrichedUsers = computed(() => {
//   return usersList.value.map(u => {
//     const userTrash = trashRecords.value.filter(t => t.userId === u.id)
//     const lastTrash = getLatest(userTrash)
//     if (lastTrash) lastTrash.imageUrl = imagesMap.value[lastTrash.id] || ''
//     const lastTrashWithImage = lastTrash
//       ? {
//         ...lastTrash,
//         imageUrl: imagesMap.value[lastTrash.id] || '',
//       }
//       : null
//     const lastRedemption = getLatest(redemptionsList.value.filter(r => r.studentId === u.id), 'timestamp')
//     const lastProfileChange = getLatest(profileChangesList.value.filter(p => p.studentId === u.id), 'timestamp')


//     return {
//       ...u,
//       lastTrash: lastTrashWithImage,
//       lastTrash,
//       lastRedemption,
//       lastProfileChange,
//     }
//   })
// })
const enrichedUsers = computed(() => {
  return usersList.value.map(u => {
    const userTrash = trashRecords.value.filter(t => t.userId === u.id)
    const lastTrash = getLatest(userTrash)
    if (lastTrash) {
      lastTrash.imageUrl = imagesMap.value[lastTrash.id] || ''
    }
    const lastRedemption = getLatest(redemptionsList.value.filter(r => r.studentId === u.id), 'timestamp')
    const lastProfileChange = getLatest(profileChangesList.value.filter(p => p.studentId === u.id), 'timestamp')

    return {
      ...u,
      lastTrash,
      lastRedemption,
      lastProfileChange,
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
</script>


<style scoped>
.dashboard-container {
  padding: 2rem;
  background: #f9fafb;
  font-family: 'Roboto', sans-serif;
  overflow-x: auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.logo {
  width: 70px;
  height: 70px;
  object-fit: cover;
  border-radius: 50%;
}

.title {
  font-size: 1.5rem;
  color: #3f51b5;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.filters input,
.filters select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
  min-width: 180px;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

table {
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
}

th {
  background-color: #3f51b5;
  color: white;
  padding: 12px;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 1;
}

td {
  padding: 10px 12px;
  text-align: center;
  border-bottom: 1px solid #eee;
}

tr:hover {
  background-color: #f5f5f5;
}

.view-button {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.view-button:hover {
  background-color: #45a049;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.modal-content img {
  max-width: 100%;
  max-height: 80vh;
}

.close {
  position: absolute;
  top: 8px;
  right: 16px;
  font-size: 1.5rem;
  cursor: pointer;
}
</style>
