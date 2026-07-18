<script setup>
const active = defineModel("active"); // 'chats' | 'snap' | 'calls' | 'profile'

const props = defineProps({
  mePicture: {type: String, default: null},
})

const items = [
  {key: 'chats', icon: 'pi pi-comments', label: 'Chats'},
  {key: 'snap', icon: 'pi pi-camera', label: 'Snap'},
  {key: 'calls', icon: 'pi pi-phone', label: 'Calls'},
  {key: 'newsletter', icon: 'pi pi-megaphone', label: 'Newsletter'},
]
</script>

<template>
  <div class="wa-rail">
    <div class="wa-rail__top">
      <button
          v-for="item in items"
          :key="item.key"
          class="wa-rail__btn"
          :class="{ 'wa-rail__btn--active': active === item.key }"
          v-tooltip.right="item.label"
          @click="active = item.key"
      >
        <i :class="item.icon"></i>
        <span class="wa-rail__label">{{ item.label }}</span>
      </button>
    </div>
    <div class="wa-rail__bottom">
      <button
          class="wa-rail__btn wa-rail__profile"
          :class="{ 'wa-rail__btn--active': active === 'profile' }"
          v-tooltip.right="'Profile'"
          @click="active = 'profile'"
      >
        <img v-if="mePicture" :src="mePicture" class="wa-rail__avatar" alt="me"/>
        <i v-else class="pi pi-user"></i>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.wa-rail {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  width: 76px;
  padding: 0.75rem 0;
  background: #202c33;
  border-radius: 12px 0 0 12px;
}

.wa-rail__top,
.wa-rail__bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
}

.wa-rail__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  width: 60px;
  height: 56px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #aebac1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  i {
    font-size: 1.35rem;
  }
}

.wa-rail__btn:hover {
  background: #2a3942;
  color: #e9edef;
}

.wa-rail__btn--active {
  color: #00a884;
  background: #2a3942;
}

.wa-rail__label {
  font-size: 0.65rem;
}

.wa-rail__profile {
  height: 60px;
}

.wa-rail__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}
</style>
