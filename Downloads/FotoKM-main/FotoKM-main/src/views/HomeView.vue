<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Camera, Search, Calendar, Car, ChevronRight, Filter, Sparkles, Trash2 } from 'lucide-vue-next';
import { db, type TripEntry } from '../db';
import ImageZoomViewer from '../components/ImageZoomViewer.vue';

const router = useRouter();
const trips = ref<TripEntry[]>([]);
const searchQuery = ref('');
const filterOpen = ref(false);

const filteredTrips = computed(() => {
  if (!searchQuery.value) return trips.value;
  const query = searchQuery.value.toLowerCase();
  return trips.value.filter(trip => 
    trip.description?.toLowerCase().includes(query) ||
    trip.date?.includes(query) ||
    trip.odometer?.toString().includes(query)
  );
});

const sortedTrips = computed(() => {
  return [...filteredTrips.value].sort((a, b) => b.timestamp - a.timestamp);
});

onMounted(async () => {
  try {
    trips.value = await db.trips.toArray();
  } catch (error) {
    console.error('Failed to load trips', error);
  }
});

const openCamera = () => {
  router.push('/add');
};

const deleteTrip = async (id: number) => {
  if (confirm('Ви впевнені, що хочете видалити цей запис?')) {
    try {
      await db.trips.delete(id);
      trips.value = trips.value.filter(trip => trip.id !== id);
    } catch (error) {
      console.error('Failed to delete trip', error);
      alert('Помилка при видаленні запису');
    }
  }
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const datePart = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  const timePart = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
};

const openTripDetail = (trip: TripEntry) => {
  router.push({ path: '/add', query: { photo: trip.photo } });
};

const zoomedImage = ref<string | null>(null);

const openZoom = (photo: string) => {
  zoomedImage.value = photo;
};

const closeZoom = () => {
  zoomedImage.value = null;
};
</script>

<template>
  <div class="min-h-screen pb-24 relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>
    <div class="absolute inset-0 opacity-40">
      <div class="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse"></div>
      <div class="absolute top-40 right-10 w-72 h-72 bg-emerald-400/15 rounded-full mix-blend-screen filter blur-3xl animate-pulse" style="animation-delay: 2s"></div>
      <div class="absolute bottom-20 left-1/2 w-72 h-72 bg-emerald-600/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse" style="animation-delay: 4s"></div>
    </div>

    <div class="relative z-10 max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto p-4 sm:p-6">
      <header class="mb-6 sm:mb-8 pt-2 sm:pt-4 text-center">
        <div>
          <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-100 tracking-tight drop-shadow-lg whitespace-nowrap">Календар поїздок</h1>
          <p class="text-slate-400 text-sm sm:text-base font-medium mt-2">Ваші поїздки в одному місці</p>
        </div>
      </header>

      <div class="relative mb-4 sm:mb-6">
        <div class="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl blur-xl opacity-20"></div>
        <div class="relative flex items-center justify-center bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-emerald-500/20 overflow-hidden shadow-xl">
          <input 
            v-model="searchQuery" 
            type="text" 
            id="search-input"
            name="search"
            placeholder="Пошук записів..." 
            class="w-full text-center bg-transparent text-slate-100 text-base sm:text-lg font-semibold placeholder-slate-500 focus:outline-none py-3 sm:py-4 px-4"
          />
        </div>
      </div>

      <div class="mb-6 flex flex-col items-center">
        <button 
          @click="openCamera"
          class="group relative p-4 rounded-2xl bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20"
        >
          <div class="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
          <Plus class="w-8 h-8 text-emerald-400 relative group-hover:rotate-90 transition-transform duration-300" />
        </button>
        <span class="text-emerald-400 text-sm font-semibold mt-2">Додати фото</span>
      </div>

      <div v-if="sortedTrips.length === 0" class="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20">
        <div class="relative mb-4 sm:mb-6">
          <div class="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full blur-2xl opacity-40 animate-pulse"></div>
          <div class="relative p-4 sm:p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 backdrop-blur-xl rounded-full border border-emerald-500/30 shadow-2xl">
            <Camera class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-emerald-400" />
          </div>
        </div>
        <h3 class="text-xl sm:text-2xl md:text-3xl font-bold text-slate-100 mb-2 drop-shadow-lg text-center px-4">Ще немає записів</h3>
        <p class="text-slate-400 text-center text-sm sm:text-base font-medium px-4">Додайте свою першу поїздку</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="trip in sortedTrips" 
          :key="trip.id"
          @click="openTripDetail(trip)"
          class="group relative rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/20 cursor-pointer"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-xl border border-emerald-500/20"></div>
          
          <div class="relative p-3 sm:p-4 md:p-5">
            <div class="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
              <div class="relative flex-shrink-0">
                <div v-if="trip.photo" class="relative" @click.stop="openZoom(trip.photo)">
                  <div class="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div class="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden shadow-xl cursor-pointer">
                    <img :src="trip.photo" alt="Trip" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                </div>
                <div v-else class="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 backdrop-blur-xl flex items-center justify-center border border-emerald-500/30">
                  <Car class="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-emerald-400/60" />
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2">
                  <div class="p-1.5 sm:p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                    <Calendar class="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <span class="text-slate-100 font-bold text-sm sm:text-base md:text-lg drop-shadow">{{ formatDate(trip.timestamp) }}</span>
                </div>
                
                <p v-if="trip.description" class="text-slate-300 text-xs sm:text-sm font-medium line-clamp-2 mb-2 sm:mb-3">
                  {{ trip.description }}
                </p>
                <p v-else class="text-slate-500 text-xs sm:text-sm font-medium italic">
                  Без опису
                </p>
              </div>

              <div class="flex flex-col sm:flex-row items-center space-x-0 sm:space-x-2 space-y-2 sm:space-y-0">
                <button 
                  @click.stop="deleteTrip(trip.id!)"
                  class="p-1.5 sm:p-2 md:p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/30"
                >
                  <Trash2 class="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <div class="p-1.5 sm:p-2 md:p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30 group-hover:translate-x-1 transition-all duration-300">
                  <ChevronRight class="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="sortedTrips.length > 0" class="mt-6 sm:mt-8 text-center">
        <div class="inline-flex items-center space-x-2 bg-slate-900/60 backdrop-blur-xl text-slate-400 py-2 sm:py-2.5 px-4 sm:px-5 rounded-2xl border border-emerald-500/20">
          <span class="font-semibold text-sm sm:text-base">{{ sortedTrips.length }} {{ sortedTrips.length === 1 ? 'запис' : sortedTrips.length >= 2 && sortedTrips.length <= 4 ? 'записи' : 'записів' }}</span>
          <span class="mx-1">·</span>
          <Sparkles class="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
        </div>
      </div>
    </div>

    <ImageZoomViewer 
      v-if="zoomedImage" 
      :src="zoomedImage" 
      alt="Zoomed photo"
      @close="closeZoom"
    />
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
