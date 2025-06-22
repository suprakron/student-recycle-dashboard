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
            <td>{{ getLastTrash(user.id)?.trashType || '-' }}</td>
            <td>{{ getLastTrash(user.id)?.amount || '-' }}</td>
            <td>{{ getLastTrash(user.id)?.pointsEarned || '-' }}</td>
            <td>{{ getLastRedemption(user.id)?.rewardName || '-' }}</td>
            <td>{{ getLastRedemption(user.id)?.pointsUsed || '-' }}</td>
            <td>{{ formatDate(getLastRedemption(user.id)?.timestamp) }}</td>
            <td>
              <button
                v-if="getLastTrash(user.id) && getLastTrash(user.id).imageBase64 && getLastTrash(user.id).imageBase64.trim() !== ''"
                @click="showImage(getLastTrash(user.id).imageBase64)"
              >
                ดูรูป
              </button>
              <span v-else>-</span>
            </td>
            <td>{{ getLastProfileChange(user.id)?.oldFullName || '-' }}</td>
            <td>{{ getLastProfileChange(user.id)?.newFullName || '-' }}</td>
            <td>{{ formatDate(getLastProfileChange(user.id)?.timestamp) }}</td>
          </tr>
        </tbody>
      </table>
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

const studentData = ref([])
const filters = ref({ name: '', classLevel: '', date: '' })
const classLevels = ref([])
const usersList = ref([])
const redemptionsList = ref([])
const profileChangesList = ref([])

const getLastTrash = (userId) => {
  const list = studentData.value.filter(d => d.userId === userId)
  if (list.length === 0) {
    console.log('No trash record for user:', userId)
    return null
  }
  const sorted = list.sort((a, b) => new Date(b.date) - new Date(a.date))
  console.log('Trash for user:', userId, sorted[0])
  return sorted[0] || null
}

const getLastRedemption = (userId) => {
  const list = redemptionsList.value.filter(r => r.studentId === userId)
  return list.sort((a, b) => new Date(b.timestamp?.toDate?.() || b.timestamp) - new Date(a.timestamp?.toDate?.() || a.timestamp))[0] || null
}

const getLastProfileChange = (userId) => {
  const list = profileChangesList.value.filter(p => p.studentId === userId)
  return list.sort((a, b) => new Date(b.timestamp?.toDate?.() || b.timestamp) - new Date(a.timestamp?.toDate?.() || a.timestamp))[0] || null
}

const fetchData = async () => {
  const [usersSnap, trashSnap, redemptionsSnap, profileChangesSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'trash_records')),
    getDocs(collection(db, 'redemptions')),
    getDocs(collection(db, 'profile_changes'))
  ])

  usersList.value = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  redemptionsList.value = redemptionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  profileChangesList.value = profileChangesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  const userMap = Object.fromEntries(usersList.value.map(u => [u.id, u]))
  const rewardMap = Object.fromEntries(redemptionsList.value.map(r => [r.studentId, r]))

  studentData.value = trashSnap.docs.map(doc => {
    const d = doc.data()
    const user = userMap[d.userId] || {}
    const reward = rewardMap[d.userId] || {}
    const date = d.date instanceof Timestamp ? d.date.toDate() : new Date(d.date)

    return {
      userId: d.userId,
      fullName: user.fullName || '-',
      classLevel: user.classLevel || '-',
      trashType: d.trashType || '-',
      amount: d.amount || 0,
      pointsEarned: (d.amount || 0) * (d.pointsPerItem || 0),
      rewardName: reward.rewardName || '-',
      pointsUsed: reward.pointsUsed || '-',
      imageBase64: d.imageBase64 ? `data:image/jpeg;base64,${d.imageBase64}` : '',
      date
    }
  })

  // กำหนด classLevels จาก usersList เพราะ filters หาใน user
  classLevels.value = [...new Set(usersList.value.map(u => u.classLevel).filter(c => c && c !== '-'))]
}

onMounted(fetchData)

const formatDate = (date) => {
  if (!date) return '-'
  try {
    return format(date instanceof Date ? date : new Date(date), 'yyyy-MM-dd')
  } catch {
    return '-'
  }
}

const filteredUsers = computed(() => {
  return usersList.value.filter(user => {
    const fullNameMatch = user.fullName?.toLowerCase().includes(filters.value.name.toLowerCase())
    const classMatch = !filters.value.classLevel || user.classLevel === filters.value.classLevel
    const dateMatch = !filters.value.date || formatDate(user.createdAt?.toDate?.() || user.createdAt) === filters.value.date
    return fullNameMatch && classMatch && dateMatch
  })
})

const showImageModal = ref(false)
const currentImage = ref('')

const showImage = (image) => {
  if (image) {
    currentImage.value = image
    showImageModal.value = true
  } else {
    alert('ไม่มีรูปหลักฐาน')
  }
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

table {
  width: 100%;
  min-width: 800px;
  border-collapse: collapse;
}

th {
  background-color: #3f51b5;
  color: white;
  padding: 12px;
  text-align: center;
}

td {
  padding: 10px 12px;
  text-align: center;
  border-bottom: 1px solid #eee;
}

tr:hover {
  background-color: #f5f5f5;
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
}

.modal-content img {
  max-width: 90vw;
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
