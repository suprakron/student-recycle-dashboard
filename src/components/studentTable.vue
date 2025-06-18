<template>
  <div class="container">
    <img src="../assets/images/logo.jpeg" alt="" class="logo" />
    <h2 class="title">
      <span class="material-symbols-outlined icon">recycling</span>
      ข้อมูลการเก็บขยะและแลกของรางวัล
    </h2>


    <div class="filters">
      <input v-model="filters.name" type="text" placeholder="ค้นหาชื่อ..." />
      <select v-model="filters.classLevel">
        <option value="">ทุกชั้น</option>
        <option v-for="cl in classLevels" :key="cl" :value="cl">{{ cl }}</option>
      </select>
      <input type="date" v-model="filters.date" />
    </div>


    <div class="table-wrapper">
      <table class="material-table">
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
            <div v-if="showImageModal" class="modal">
              <div class="modal-content">
                <span class="close" @click="closeImageModal">&times;</span>
                <img :src="currentImage" alt="หลักฐานการทิ้ง" />
              </div>
            </div>
            <td>{{ entry.amount }}</td>
            <td>{{ entry.pointsEarned }}</td>
            <td>{{ entry.rewardName || '-' }}</td>
            <td>{{ entry.pointsUsed || '-' }}</td>
            <td>{{ entry.date }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 2rem;
  font-family: 'Roboto', sans-serif;
  background: #f9fafb;
}

.logo {
  width: 80px;
  border-radius: 50%;
  margin-bottom: 1rem;
}

.title {
  font-size: 1.6rem;
  font-weight: 600;
  color: #3f51b5;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 1rem;
}

.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filters input,
.filters select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 1rem;
}

.table-wrapper {
  overflow-x: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.material-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.material-table th {
  background-color: #3f51b5;
  color: #fff;
  padding: 12px;
  font-weight: 600;
  text-align: center;
  position: sticky;
  top: 0;
}

.material-table td {
  padding: 10px 12px;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
}

.material-table tbody tr:hover {
  background-color: #f1f1f1;
  transition: background-color 0.3s ease;
}

.icon {
  font-family: 'Material Symbols Outlined';
  font-size: 1.6rem;
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
}

.modal-content {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  position: relative;
}

.modal-content img {
  max-width: 500px;
  max-height: 500px;
}

.close {
  position: absolute;
  top: 5px;
  right: 10px;
  cursor: pointer;
  font-size: 1.5rem;
}
</style>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../firebase/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { format } from 'date-fns'
const studentData = ref([])
const filters = ref({
  name: '',
  classLevel: '',
  date: ''
})
const classLevels = ref([])
const fetchData = async () => {
  const usersSnap = await getDocs(collection(db, 'users'))
  const trashSnap = await getDocs(collection(db, 'trash_records'))
  const redemptionsSnap = await getDocs(collection(db, 'redemptions'))

  const userMap = {}
  usersSnap.forEach(doc => {
    userMap[doc.id] = { ...doc.data(), userId: doc.id }
  })

  const rewardsMap = {}
  redemptionsSnap.forEach(doc => {
    const data = doc.data()
    rewardsMap[data.studentId] = {
      rewardName: data.rewardName,
      pointsUsed: data.pointsUsed
    }
  })


  const records = trashSnap.docs.map(doc => {
    const data = doc.data()
    const user = userMap[data.userId] || {}
    const reward = rewardsMap[data.userId] || {}
    return {
      fullName: user.fullName,
      classLevel: user.classLevel,
      trashType: data.trashType,
      amount: data.amount,
      pointsEarned: (data.amount || 0) * (data.pointsPerItem || 0),
      rewardName: reward.rewardName,
      pointsUsed: reward.pointsUsed,
      imageBase64: data.imageBase64 || '',
      date: data.date?.toDate?.() || new Date(),
      userId: data.userId
    }
  })
  studentData.value = records
  const uniqueClasses = [...new Set(records.map(r => r.classLevel))].filter(Boolean)
  classLevels.value = uniqueClasses
}
const formatDate = (date) => format(date, 'yyyy-MM-dd')

const filteredData = computed(() => {
  return studentData.value.filter(entry => {
    const nameMatch = entry.fullName?.toLowerCase().includes(filters.value.name.toLowerCase())
    const classMatch = filters.value.classLevel ? entry.classLevel === filters.value.classLevel : true
    const dateMatch = filters.value.date
      ? formatDate(entry.date) === filters.value.date
      : true
    return nameMatch && classMatch && dateMatch
  })
})

onMounted(fetchData)
const showImageModal = ref(false)
const currentImage = ref('')

const showImage = (base64) => {
  if (base64) {
    currentImage.value = base64
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
