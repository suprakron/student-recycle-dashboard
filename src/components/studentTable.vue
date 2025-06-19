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

    <TableSection title="ข้อมูลการทิ้งขยะ">
      <table>
        <thead>
          <tr>
            <th>ชื่อ</th>
            <th>ชั้น</th>
            <th>ประเภทขยะ</th>
            <th>หลักฐานการทิ้ง</th>
            <th>จำนวน</th>
            <th>แต้มที่ได้</th>
            <th>ของรางวัล</th>
            <th>แต้มที่ใช้</th>
            <th>วันที่</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in filteredData" :key="entry.userId + entry.date">
           <td>{{ entry.fullName }}</td>
            <td>{{ entry.classLevel }}</td>
            <td>{{ entry.trashType }}</td>
            <td>
              <button @click="showImage(entry.imageBase64)">ดูรูป</button>
            </td>
            <td>{{ entry.amount }}</td>
            <td>{{ entry.pointsEarned }}</td>
            <td>{{ entry.rewardName }}</td>
            <td>{{ entry.pointsUsed }}</td>
            <td>{{ formatDate(entry.date) }}</td>
          </tr>
        </tbody>
      </table>
    </TableSection>

    <TableSection title="รายชื่อนักเรียน">
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
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in usersList" :key="user.id">
         <td>{{ user.studentId || '-' }}</td>
            <td>{{ user.fullName || '-' }}</td>
            <td>{{ user.classLevel || '-' }}</td>
            <td>{{ user.email || '-' }}</td>
            <td>{{ user.phone || '-' }}</td>
            <td>{{ user.points || 0 }}</td>
            <td>{{ formatDate(user.createdAt?.toDate?.() || user.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </TableSection>

<TableSection title="ของรางวัลที่แลก">
  <table>
    <thead>
      <tr>
        <th>นักเรียน</th>  
        <th>ของรางวัล</th>
        <th>แต้มที่ใช้</th>
        <th>วันที่แลก</th>
 
      </tr>
    </thead>
    <tbody>
      <tr v-for="redemption in redemptionsList" :key="redemption.id">
        <td>{{ getUserFullName(redemption.studentId) }}  </td>  
        <td>{{ redemption.rewardName }}</td>
        <td>{{ redemption.pointsUsed }}</td>
        <td>{{ formatDate(redemption.timestamp?.toDate?.() || redemption.timestamp) }}</td>
      
      </tr>
    </tbody>
  </table>
</TableSection>


    <TableSection title="ประวัติการเปลี่ยนแปลงโปรไฟล์">
      <table>
        <thead>
          <tr>
            <th>รหัสนักเรียน</th>
            <th>ชื่อเก่า</th>
            <th>ชื่อใหม่</th>
            <th>วันที่เปลี่ยนแปลง</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="change in profileChangesList" :key="change.id">
           <td>{{ getUserFullName(redemption.studentId) }} ({{ redemption.studentId }})</td> 
            <td>{{ change.oldFullName }}</td>
            <td>{{ change.newFullName }}</td>
            <td>{{ formatDate(change.timestamp?.toDate?.() || change.timestamp) }}</td>
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

const getUserFullName = (userId) => {
  const user = usersList.value.find(u => u.id === userId)
  return user ? user.fullName : '-'
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

  classLevels.value = [...new Set(studentData.value.map(r => r.classLevel).filter(c => c && c !== '-'))]
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

const filteredData = computed(() =>
  studentData.value.filter(entry =>
    entry.fullName.toLowerCase().includes(filters.value.name.toLowerCase()) &&
    (!filters.value.classLevel || entry.classLevel === filters.value.classLevel) &&
    (!filters.value.date || formatDate(entry.date) === filters.value.date)
  )
)

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