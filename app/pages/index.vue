<template>
  <div class="page">
    <div class="container">
      <div class="text-h6 text-center">異環每日/每週</div>
      <!-- ✅ 進度 -->
      <v-card class="mb-3 pa-3 rounded-xl py-5">
        <div class="d-flex justify-space-between">
          <span style="font-size: 18px">完成度</span>
          <span>{{ progress }}%</span>
        </div>
        <v-progress-linear
          :model-value="progress"
          height="15"
          color="deep-purple"
        />
      </v-card>

      <v-row class="mb-3">
        <v-col cols="6">
          <v-btn block color="success" @click="completeAll"> 全部完成 </v-btn>
        </v-col>

        <v-col cols="6">
          <v-btn block color="grey" @click="resetAll"> 全部未完成 </v-btn>
        </v-col>
      </v-row>

      <!-- ✅ Tabs -->
      <v-tabs v-model="tab" grow show-arrows>
        <v-tab v-for="c in categories" :key="c" :value="c" class="tab-wrapper">
          <!-- ✅ tab文字 -->
          <span>{{ c }}</span>

          <v-badge
            v-if="getUnfinishedCount(c) > 0"
            :content="getUnfinishedCount(c)"
            color="red"
            location="top end"
            :offset-x="isMobile ? -12 : -15"
            :offset-y="isMobile ? -5 : -2"
          >
          </v-badge>
        </v-tab>
      </v-tabs>

      <!-- ✅ 任務 -->
      <v-window v-model="tab" touch>
        <v-window-item v-for="c in categories" :key="c" :value="c">
          <v-row class="mt-2">
            <TransitionGroup tag="div" class="task-list w-100" name="move">
              <v-col
                v-for="item in filteredTasks(c)"
                :key="item.name"
                cols="12"
                class="mt-2"
              >
                <v-card
                  class="task-card"
                  :class="[getColor(item.type), { done: item.done }]"
                  @click="toggleDone(item)"
                >
                  <!-- ✅ 左：目標 -->
                  <div class="left">
                    {{ item.name }}
                  </div>

                  <!-- ✅ 中：膠囊 -->
                  <div class="middle">
                    <div class="pill">
                      {{ item.freq }}
                    </div>
                  </div>

                  <!-- ✅ 右：備註 -->
                  <div class="right">
                    {{ item.desc }}
                  </div>

                  <!-- ✅ 右上 icon -->
                  <v-icon class="status-icon">
                    {{ item.done ? "mdi-check-circle" : "mdi-circle-outline" }}
                  </v-icon>
                </v-card>
              </v-col>
            </TransitionGroup>
          </v-row>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useDisplay } from "vuetify";

const { mobile } = useDisplay();
const isMobile = computed(() => mobile.value);

const categories = ["地圖資源", "好感度", "都市大亨", "自宅", "體力副本"];
const tab = ref("地圖資源");

const tasks = ref([
  {
    type: "地圖資源",
    freq: "日",
    name: "魔女之家",
    desc: "諭石位置、逸聞位置、傷害buff",
  },
  {
    type: "地圖資源",
    freq: "日",
    name: "搶路人(4公事包)",
    desc: "機率出車鑰匙、錢包=1000方斯or脆薯餅一個(500甲蟲幣)",
  },
  {
    type: "地圖資源",
    freq: "日",
    name: "許願池(S武器)",
    desc: "驅動塊代幣、S級武器",
  },
  {
    type: "地圖資源",
    freq: "日",
    name: "小吱",
    desc: "40000方斯，重擊怪物，甲蟲副本選第一關慢慢丟",
  },
  {
    type: "地圖資源",
    freq: "日",
    name: "小混混",
    desc: "善良脆薯餅(警局換甲蟲幣1:500)，警局用地圖右上傳點最近",
  },
  { type: "地圖資源", freq: "週", name: "拍賣會", desc: "瑪門升級材料" },
  { type: "地圖資源", freq: "週", name: "保險箱", desc: "13750方斯" },

  {
    type: "好感度",
    freq: "日",
    name: "送禮",
    desc: "角色好感度(潯、小吱、娜娜莉、九原)",
  },
  {
    type: "好感度",
    freq: "日",
    name: "看電影",
    desc: "傳斑蝶、買票、電影可ALT+左上跳過",
  },

  { type: "都市大亨", freq: "雙週", name: "粉爪大劫案", desc: "方斯、粉爪幣" },
  { type: "都市大亨", freq: "日", name: "一咖舍領收益", desc: "方斯" },
  { type: "都市大亨", freq: "日", name: "同城派送", desc: "方斯" },

  { type: "自宅", freq: "日", name: "木箱領甲蟲幣", desc: "甲蟲幣" },
  { type: "自宅", freq: "日", name: "哈索爾領驅動塊", desc: "需要140W房子" },
  { type: "自宅", freq: "日", name: "領雲朵(好感度)", desc: "雲朵" },
  { type: "自宅", freq: "週", name: "貓咪瑪門", desc: "方斯" },

  { type: "體力副本", freq: "週", name: "週本", desc: "F1第3頁第5項" },
  { type: "體力副本", freq: "日", name: "各式材料", desc: "F1第三頁" },
]);

tasks.value.forEach((t) => {
  t.done = false;
  t.date = null;
});

const filteredTasks = (type) => {
  return tasks.value
    .filter((t) => t.type === type)
    .sort((a, b) => a.done - b.done);
};

const progress = computed(() => {
  const done = tasks.value.filter((t) => t.done).length;
  return Math.round((done / tasks.value.length) * 100);
});

const toggleDone = (item) => {
  item.done = !item.done;
  item.date = item.done ? new Date().toISOString() : null;
};

const completeAll = () => {
  tasks.value.forEach((t) => {
    if (t.type === tab.value) {
      t.done = true;
      t.date = new Date().toISOString();
    }
  });
};

const resetAll = () => {
  tasks.value.forEach((t) => {
    if (t.type === tab.value) {
      t.done = false;
      t.date = null;
    }
  });
};

const getUnfinishedCount = (type) => {
  return tasks.value.filter((t) => t.type === type && !t.done).length;
};

const getColor = (type) =>
  ({
    地圖資源: "bg-map",
    好感度: "bg-love",
    都市大亨: "bg-city",
    自宅: "bg-home",
    體力副本: "bg-dungeon",
  }[type]);
</script>

<style scoped>
@media (max-width: 768px) {
  .container {
    width: 100%;
  }
  .task-card > .left {
    width: 20%;
    font-size: 16px;
  }
  .task-card > .middle {
    width: 20%;
  }
  .task-card > .right {
    width: 60%;
    font-size: 14px;
  }
  .task-card > .middle > .pill {
    border-radius: 999px;
    background: #333;
    color: white;
  }
}

/* ✅ 整頁 */
.page {
  height: 100vh;
  background: #f5f5f5;
  display: flex;
  justify-content: center;
}

/* ✅ container */
.container {
  width: 800px;
  height: 100%;
  overflow-y: auto;
  padding: 10px;
  overflow-x: hidden;
  /* overflow-y: hidden; */
  -webkit-overflow-scrolling: touch;
  padding-bottom: 50px;
}

.container::-webkit-scrollbar {
  display: none;
}

/* ✅ 卡片 layout */
.task-card {
  height: 100px;
  display: flex;
  align-items: center;
  position: relative;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
}

/* ✅ 左30% */
.left {
  width: 20%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  word-break: break-word;
  font-size: 18px;
}

/* ✅ 中10% */
.middle {
  width: 10%;
  display: flex;
  justify-content: center;
}

/* ✅ 右60% */
.right {
  width: 60%;
  display: flex;
  align-items: center;
  word-break: break-word;
}

/* ✅ 膠囊（你指定） */
.pill {
  font-size: 14px;
  padding: 5px 15px;
  border-radius: 999px;
  background: #333;
  color: white;
}

/* ✅ icon */
.status-icon {
  position: absolute;
  top: 6px;
  right: 6px;
}

/* ✅ 完成 */
.done {
  background: #e0e0e0 !important;
  opacity: 0.6;
  transform: scale(0.98);
}

/* ✅ 顏色 */
.bg-map {
  background: #d1c4e9;
}
.bg-love {
  background: #f8bbd0;
}
.bg-city {
  background: #ffe0b2;
}
.bg-home {
  background: #c8e6c9;
}
.bg-dungeon {
  background: #bbdefb;
}

/* ✅ 動畫核心 */
.move-move {
  transition: transform 0.5s ease;
}

/* ✅ 新增 */
.move-enter-active,
.move-leave-active {
  transition: all 1s ease;
}

.move-enter-from,
.move-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
.tab-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  line-height: 20px;
}

.tab-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ✅ badge 固定右上角 */
.tab-badge {
  position: absolute;
  top: 16px;
  right: 30px;
}
</style>
