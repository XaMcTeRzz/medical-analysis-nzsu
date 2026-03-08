<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Camera, Save, Mic, MicOff, ChevronLeft, Loader2, Sparkles, Zap, Image as ImageIcon, Wifi, WifiOff, Download } from 'lucide-vue-next';
import { db } from '../db';
import { sanitizeHtml } from '../utils';

const router = useRouter();
const route = useRoute();
const photo = ref<string | null>(null);
const photoPreview = ref<string | null>(null);
const description = ref('');
const isListening = ref(false);
const isProcessingPhoto = ref(false);
const recognition = ref<any>(null);
const silenceTimer = ref<NodeJS.Timeout | null>(null);
const offlineMode = ref(false);
const voskModel = ref<any>(null);
const isVoskLoading = ref(false);

const handleOnlineStatusChange = () => {
  if (navigator.onLine) {
    offlineMode.value = false;
  } else {
    offlineMode.value = true;
  }
};

onMounted(() => {
  const photoParam = route.query.photo as string;
  
  if (photoParam) {
    photo.value = photoParam;
    photoPreview.value = photoParam;
  } else if (!route.query.fromCamera) {
    triggerCamera();
  }
  
  window.addEventListener('online', handleOnlineStatusChange);
  window.addEventListener('offline', handleOnlineStatusChange);
  
  if (!navigator.onLine) {
    offlineMode.value = true;
  }
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnlineStatusChange);
  window.removeEventListener('offline', handleOnlineStatusChange);
});

const triggerCamera = () => {
  const fileInput = document.querySelector('input[type="file"][accept="image/*"][capture="environment"]') as HTMLInputElement;
  if (fileInput) {
    fileInput.click();
  }
};

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  recognition.value = new SpeechRecognition();
  recognition.value.continuous = false;
  recognition.value.lang = 'uk-UA';
  recognition.value.interimResults = true;
  recognition.value.maxAlternatives = 1;

  let finalTranscript = '';

  const stopListening = () => {
    isListening.value = false;
    if (silenceTimer.value) {
      clearTimeout(silenceTimer.value);
      silenceTimer.value = null;
    }
    if (recognition.value) {
      recognition.value.stop();
    }
  };

  const resetSilenceTimer = () => {
    if (silenceTimer.value) {
      clearTimeout(silenceTimer.value);
    }
    silenceTimer.value = setTimeout(() => {
      if (isListening.value) {
        stopListening();
      }
    }, 2000);
  };

  recognition.value.onstart = () => {
    finalTranscript = '';
  };

  recognition.value.onresult = (event: any) => {
    resetSilenceTimer();
    
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    if (finalTranscript) {
      description.value += (description.value ? ' ' : '') + finalTranscript;
      finalTranscript = '';
    }
  };

  recognition.value.onerror = (event: any) => {
    console.error('Speech recognition error', event.error);
    
    if (event.error === 'network') {
      if (offlineMode.value) {
        alert('Офлайн розпізнавання наразі недоступне. Використовуйте Chrome та завантажте модель.');
      } else {
        alert('Для розпізнавання голосу потрібен інтернет. Спробуйте пізніше.');
      }
      stopListening();
    } else if (event.error === 'not-allowed') {
      alert('Дозвольте доступ до мікрофона в налаштуваннях браузера.');
      stopListening();
    } else if (event.error === 'no-speech') {
      if (isListening.value) {
        stopListening();
      }
    } else {
      stopListening();
    }
  };
  
  recognition.value.onend = () => {
    if (silenceTimer.value) {
      clearTimeout(silenceTimer.value);
      silenceTimer.value = null;
    }
  };
}

const checkInternetConnection = () => {
  if (!navigator.onLine) {
    return false;
  }
  return true;
};

const floatTo16BitPCM = (float32Array: Float32Array): Int16Array => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
};

const initVosk = async () => {
  try {
    const { model } = await import('vosk-browser');
    
    const modelUrl = '/model/vosk-model-uk-v3-small/';
    
    voskModel.value = await new model({
      modelUrl,
      options: {
        sampleRate: 48000
      }
    });
    
    return true;
  } catch (e) {
    console.error('Failed to load Vosk:', e);
    return false;
  }
};

const startOfflineRecognition = async () => {
  if (!voskModel.value) {
    isVoskLoading.value = true;
    const loaded = await initVosk();
    isVoskLoading.value = false;
    
    if (!loaded) {
      alert('Не вдалося завантажити модель для оффлайн розпізнавання. Спробуйте пізніше.');
      return null;
    }
  }
  
  try {
    const recognizer = await voskModel.value.createRecognizer();
    
    const audioContext = new AudioContext({ sampleRate: 48000 });
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(mediaStream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    source.connect(processor);
    
    let lastSpeechTime = Date.now();
    let finalText = '';
    
    processor.onaudioprocess = (e: any) => {
      if (!isListening.value) {
        source.disconnect();
        processor.disconnect();
        audioContext.close();
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }
      
      const inputData = e.inputBuffer.getChannelData(0);
      const int16Data = floatTo16BitPCM(inputData);
      
      recognizer.acceptWaveform(int16Data);
      
      const result = recognizer.result();
      
      if (result && result.result && result.result.length > 0) {
        const text = result.result.map((r: any) => r.word).join(' ');
        if (text && text !== finalText) {
          finalText = text;
          description.value += (description.value ? ' ' : '') + text;
          lastSpeechTime = Date.now();
          resetSilenceTimer();
        }
      }
    };
    
    return { recognizer, mediaStream, audioContext, source, processor };
  } catch (e) {
    console.error('Failed to start offline recognition:', e);
    isListening.value = false;
    return null;
  }
};

let offlineRecognition: any = null;

const toggleSpeech = async () => {
  if (!recognition.value && !offlineMode.value) {
    alert('Ваш браузер не підтримує голосове введення.');
    return;
  }
  
  if (isListening.value) {
    stopListening();
  } else {
    isListening.value = true;
    
    if (offlineMode.value) {
      offlineRecognition = await startOfflineRecognition();
      if (!offlineRecognition) {
        isListening.value = false;
      }
    } else {
      if (!checkInternetConnection()) {
        offlineMode.value = true;
        offlineRecognition = await startOfflineRecognition();
        if (!offlineRecognition) {
          isListening.value = false;
        }
        return;
      }
      
      setTimeout(() => {
        if (isListening.value) {
          try {
            recognition.value.start();
          } catch (e) {
            console.error('Failed to start recognition:', e);
            isListening.value = false;
          }
        }
      }, 100);
    }
  }
};

const stopListening = () => {
  isListening.value = false;
  if (silenceTimer.value) {
    clearTimeout(silenceTimer.value);
    silenceTimer.value = null;
  }
  
  if (offlineMode.value && offlineRecognition) {
    try {
      if (offlineRecognition.recognizer) {
        offlineRecognition.recognizer.free();
      }
      if (offlineRecognition.source) {
        offlineRecognition.source.disconnect();
      }
      if (offlineRecognition.processor) {
        offlineRecognition.processor.disconnect();
      }
      if (offlineRecognition.audioContext) {
        offlineRecognition.audioContext.close();
      }
      if (offlineRecognition.mediaStream) {
        offlineRecognition.mediaStream.getTracks().forEach((track: any) => track.stop());
      }
    } catch (e) {
      console.error('Error stopping offline recognition:', e);
    }
    offlineRecognition = null;
  } else if (recognition.value) {
    try {
      recognition.value.stop();
    } catch (e) {
      console.error('Error stopping recognition:', e);
    }
  }
};

const resetSilenceTimer = () => {
  if (silenceTimer.value) {
    clearTimeout(silenceTimer.value);
  }
  silenceTimer.value = setTimeout(() => {
    if (isListening.value) {
      stopListening();
    }
  }, 2000);
};

const toggleOfflineMode = () => {
  if (isListening.value) {
    alert('Зупиніть запис перед перемиканням режиму.');
    return;
  }
  offlineMode.value = !offlineMode.value;
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    
    isProcessingPhoto.value = true;
    
    router.replace({ query: { fromCamera: 'true' } });
    
    const reader = new FileReader();
    
    reader.onloadstart = () => {
      photoPreview.value = null;
    };
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      photo.value = result;
      photoPreview.value = result;
      isProcessingPhoto.value = false;
    };
    
    reader.onerror = () => {
      isProcessingPhoto.value = false;
      alert('Помилка при завантаженні фото');
    };
    
    reader.readAsDataURL(file);
  }
};

const clearPhoto = () => {
  photo.value = null;
  photoPreview.value = null;
};

const saveTrip = async () => {
  if (!photo.value) {
    alert('Будь ласка, додайте фото одометра');
    return;
  }
  
  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    await db.trips.add({
      date: dateStr || '',
      timestamp: now.getTime(),
      odometer: 0,
      description: sanitizeHtml(description.value),
      photo: photo.value
    });
    router.push('/');
  } catch (error) {
    console.error('Failed to save trip', error);
    alert('Помилка при збереженні запису.');
  }
};

const goBack = () => {
  router.push('/');
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

    <div class="relative z-10 max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto p-4 sm:p-6">
      <header class="flex items-center mb-6 sm:mb-8 pt-2 sm:pt-4">
        <button 
          @click="goBack" 
          class="group p-2.5 sm:p-3 md:p-3.5 rounded-2xl bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20"
        >
          <ChevronLeft class="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div class="ml-3 sm:ml-5">
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-black text-slate-100 tracking-tight drop-shadow-lg">Новий запис</h1>
          <p class="text-slate-400 text-xs sm:text-sm font-medium mt-1">Додайте фото одометра</p>
        </div>
      </header>

      <div class="space-y-4 sm:space-y-6">
        <div 
          class="relative rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/20"
          :class="photo ? 'bg-slate-900/60 backdrop-blur-xl border border-emerald-500/20' : 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/50'"
        >
          <div v-if="photoPreview" class="relative">
            <div class="aspect-square w-full">
              <img 
                :src="photoPreview" 
                alt="Odometer" 
                class="w-full h-full object-cover"
                @load="isProcessingPhoto = false"
              />
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent"></div>
            
            <button 
              @click="clearPhoto"
              class="absolute top-2 sm:top-4 right-2 sm:right-4 p-2 sm:p-3 bg-red-500/90 backdrop-blur-sm text-white rounded-2xl hover:bg-red-600 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-red-500/50"
            >
              <ImageIcon class="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div class="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 flex items-center justify-center space-x-2 sm:space-x-3">
              <label class="flex-1 cursor-pointer">
                <div class="flex items-center justify-center space-x-1.5 sm:space-x-2 bg-emerald-500/20 backdrop-blur-xl text-emerald-400 py-2 sm:py-3 px-3 sm:px-6 rounded-2xl hover:bg-emerald-500/30 active:scale-95 transition-all duration-300 border border-emerald-500/30">
                  <Camera class="w-4 h-4 sm:w-5 sm:h-5" />
                  <span class="font-semibold text-xs sm:text-base">Змінити фото</span>
                </div>
                <input type="file" accept="image/*" capture="environment" class="hidden" @change="handleFileChange" />
              </label>
            </div>
          </div>

          <div v-else class="flex flex-col items-center justify-center p-6 sm:p-8 md:p-12 min-h-[240px] sm:min-h-[280px] md:min-h-[320px]">
            <label class="cursor-pointer flex flex-col items-center w-full">
              <div class="relative mb-4 sm:mb-6 group">
                <div class="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
                <div class="relative p-4 sm:p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 backdrop-blur-xl rounded-full group-hover:scale-110 transition-transform duration-300 border border-emerald-500/30 shadow-2xl">
                  <Camera class="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
                </div>
              </div>
              
              <h3 class="text-xl sm:text-2xl md:text-3xl font-bold text-slate-100 mb-2 drop-shadow-lg text-center px-4">Додайте фото</h3>
              <p class="text-slate-400 text-center text-sm sm:text-base mb-4 sm:mb-6 font-medium px-4">Натисніть для вибору з галереї або камери</p>
              
              <div class="flex items-center space-x-1.5 sm:space-x-2 bg-emerald-500/20 backdrop-blur-xl text-emerald-400 py-2 sm:py-3 px-4 sm:px-6 rounded-2xl hover:bg-emerald-500/30 active:scale-95 transition-all duration-300 border border-emerald-500/30 group-hover:shadow-lg group-hover:shadow-emerald-500/20">
                <Sparkles class="w-4 h-4 sm:w-5 sm:h-5" />
                <span class="font-semibold text-sm sm:text-base">Вибрати фото</span>
              </div>
              
              <input type="file" accept="image/*" capture="environment" class="hidden" @change="handleFileChange" />
            </label>
          </div>

          <div v-if="isProcessingPhoto" class="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-20">
            <div class="text-center">
              <div class="relative mb-3 sm:mb-4">
                <div class="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                <Loader2 class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-emerald-400 relative animate-spin" />
              </div>
              <p class="text-slate-100 text-base sm:text-lg font-bold">Завантаження...</p>
            </div>
          </div>
        </div>

        <div class="rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-emerald-500/20 p-4 sm:p-6 shadow-xl">
          <div class="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div class="p-2 sm:p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
              <Zap class="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <label class="text-lg sm:text-xl font-bold text-slate-100 drop-shadow-lg">Опис поїздки</label>
          </div>
          
          <div class="relative">
            <textarea 
              v-model="description" 
              rows="4" 
              placeholder="Опишіть маршрут, причину поїздки, інші деталі..." 
              class="w-full p-3 sm:p-4 bg-slate-800/80 rounded-2xl text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:ring-4 focus:ring-emerald-500/30 focus:bg-slate-800 transition-all duration-300 shadow-lg resize-none border border-emerald-500/20"
            ></textarea>
            <button 
              @click="toggleSpeech" 
              class="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 p-2 sm:p-3 rounded-xl transition-all duration-300 shadow-lg active:scale-95"
              :class="isListening ? 'bg-gradient-to-br from-red-500 to-red-600 text-white ring-4 ring-red-500/30' : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'"
            >
              <MicOff v-if="isListening" class="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              <Mic v-else class="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          
          <div v-if="isListening" class="mt-3 flex items-center space-x-1.5 sm:space-x-2 bg-red-500/20 backdrop-blur-sm text-red-400 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border border-red-500/30">
            <div class="relative">
              <div class="absolute inset-0 bg-red-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
              <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-400 rounded-full relative"></div>
            </div>
            <span class="font-semibold text-xs sm:text-sm">Слухаю... говоріть українською (авто-стоп після 2 сек тиші)</span>
          </div>
          
          <div class="mt-3 flex items-center space-x-2">
            <div class="p-2 rounded-xl transition-all duration-300" :class="offlineMode ? 'bg-amber-500/20' : 'bg-emerald-500/20'">
              <WifiOff v-if="offlineMode" class="w-4 h-4 text-amber-400" />
              <Wifi v-else class="w-4 h-4 text-emerald-400" />
            </div>
            <div class="flex flex-col">
              <span class="text-xs sm:text-sm font-semibold" :class="offlineMode ? 'text-amber-400' : 'text-emerald-400'">
                {{ offlineMode ? 'Оффлайн режим' : 'Онлайн режим' }}
              </span>
              <span class="text-[10px] sm:text-xs text-slate-500">
                {{ offlineMode ? 'Працює без інтернету' : 'Потрібен інтернет' }}
              </span>
            </div>
          </div>
          
          <div v-if="isVoskLoading" class="mt-3 flex items-center space-x-2 bg-amber-500/20 backdrop-blur-sm text-amber-400 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border border-amber-500/30">
            <Download class="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
            <span class="font-semibold text-xs sm:text-sm">Завантаження моделі розпізнавання (~20MB)...</span>
          </div>
        </div>

        <button 
          @click="saveTrip" 
          :disabled="!photo"
          class="group relative w-full overflow-hidden rounded-2xl py-3.5 sm:py-4 md:py-5 font-bold text-base sm:text-lg md:text-xl shadow-2xl transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          :class="photo ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 hover:shadow-emerald-500/50' : 'bg-slate-700'"
        >
          <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div class="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-emerald-500/10 to-emerald-600/10"></div>
          </div>
          
          <div class="relative flex items-center justify-center space-x-2 sm:space-x-3">
            <Save class="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform duration-300" />
            <span class="text-white text-sm sm:text-base">Зберегти запис</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
</style>
