<template>
  <v-app>
    <v-container class="app-container rounded-lg">
      <!-- 🎮 HEADER -->
      <div class="header">
        <h1>QUEST LIST</h1>
      </div>

      <!-- 🎮 新增任務 -->
      <div class="quest-input">
        <!-- ✅ 第一列 -->
        <div class="input-row-top">
          <v-select
            v-model="selectedAccount"
            :items="accounts"
            label="Show"
            density="compact"
            hide-details
            class="account-select"
          />
          <v-select
            v-model="newQuest.account"
            :items="accountsNoAll"
            label="Account"
            density="compact"
            class="input-select"
            hide-details
          />

          <v-select
            v-model="newQuest.type"
            :items="types"
            label="Type"
            density="compact"
            class="input-select"
            hide-details
          />
        </div>

        <!-- ✅ 第二列 -->
        <div class="input-row-bottom">
          <!-- ✅ 按鈕 -->
          <v-btn class="pixel-btn" @click="handleAdd"> NEW QUEST </v-btn>

          <!-- ✅ textarea -->
          <v-textarea
            v-model="newQuest.task"
            label="QUEST"
            rows="1"
            auto-grow
            class="quest-textarea"
          />
        </div>
      </div>

      <!-- 🎮 任務列表 -->
      <div class="quest-list">
        <div class="quest-title">QUEST LOG</div>

        <v-fade-transition group>
          <div
            v-for="task in filteredTasks"
            :key="task._index"
            class="quest-card"
            :style="{
              '--card-bg': getColor(task.type),
            }"
          >
            <div class="quest-row">
              <!-- checkbox -->
              <input
                type="checkbox"
                v-model="task.done"
                @change="toggleDone(task)"
                class="pixel-checkbox"
              />

              <!-- ✅ 任務內容（正常字體） -->
              <div class="quest-content">
                <div class="quest-main" :class="{ done: task.done }">
                  {{ task.task }}
                </div>

                <div class="quest-sub pixel-font">
                  <!-- ✅ type badge -->
                  <v-chip
                    size="small"
                    class="type-chip pixel-font"
                    :style="{
                      borderColor: getTypeStyle(task.type),
                      'background-color': getTypeStyle(task.type),
                    }"
                  >
                    {{ task.type }}
                  </v-chip>

                  <!-- ✅ 日期 -->
                  <span class="quest-date pixel-font">
                    {{ formatDate(task.date) }}
                  </span>
                </div>
              </div>

              <!-- ✅ 刪除（最右＋置中） -->
              <button
                class="pixel-btn small delete-btn"
                @click="confirmDelete(task)"
              >
                X
              </button>
            </div>
          </div>
        </v-fade-transition>
      </div>

      <!-- ✅ Dialog -->
      <v-dialog v-model="dialog" class="pixel-font" width="300">
        <v-card>
          <v-card-title>DELETE TASK?</v-card-title>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="dialog = false">CANCEL</v-btn>
            <v-btn color="red" @click="removeTask">DELETE</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- ✅ Snackbar -->
      <v-snackbar v-model="snackbar" class="pixel-font">
        {{ message }}
      </v-snackbar>
    </v-container>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useTasksApi } from "@/composables/useTasksApi";
import { debounce } from "lodash-es";
import { useHead } from "#imports";

/* ✅ 載入像素字體 */
useHead({
  link: [
    {
      href: "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap",
      rel: "stylesheet",
    },
  ],
});

const { fetchTasks, addTask, updateTask, deleteTask } = useTasksApi();

const tasks = ref([]);
const snackbar = ref(false);
const message = ref("");
const dialog = ref(false);
const deleteTarget = ref(null);

const selectedAccount = ref("All");

const types = ["工作", "家庭", "個人"];

const newQuest = ref({
  account: "",
  type: "",
  task: "",
  done: "0",
  date: "",
});

const getColor = (type) => {
  return (
    {
      工作: "#424242",
      家庭: "#00695c",
      個人: "#37474f",
    }[type] || "#2a2a2a"
  );
};

const getTypeStyle = (type) => {
  return {
    工作: "#212121",
    家庭: "#004D40",
    個人: "#263238",
  }[type];
};

/* ✅ debounce */
const debounceMap = {};

const accounts = computed(() => {
  const set = new Set(tasks.value.map((t) => t.account));
  return ["All", ...set];
});

const accountsNoAll = computed(() => accounts.value.filter((a) => a !== "All"));

const filteredTasks = computed(() => {
  if (selectedAccount.value === "All") return tasks.value;
  return tasks.value.filter((t) => t.account === selectedAccount.value);
});

const loadData = async () => {
  const { rows } = await fetchTasks();
  tasks.value = rows.map((row) => ({
    ...row,
    done: row.done === "1" || row.done === 1,
  }));
};

const handleAdd = async () => {
  newQuest.value.date = new Date().toISOString();

  await addTask(newQuest.value);

  showMsg("New Quest created. ✅");

  newQuest.value = { account: "", type: "", task: "", done: "0", date: "" };

  loadData();
};

const toggleDone = (task) => {
  const key = task._index;

  if (debounceMap[key]) debounceMap[key].cancel();

  debounceMap[key] = debounce(async () => {
    try {
      const { _index, ...data } = task;
      data.done = task.done ? "1" : "0";

      await updateTask(_index, data);

      showMsg("Quest list updated.");
    } catch {
      task.done = !task.done;
      showMsg("Quest list update failed...");
    }
  }, 500);

  debounceMap[key]();
};

const confirmDelete = (task) => {
  deleteTarget.value = task;
  dialog.value = true;
};

const removeTask = async () => {
  const target = deleteTarget.value;

  tasks.value = tasks.value.filter((t) => t._index !== target._index);
  dialog.value = false;

  await deleteTask(target._index);

  showMsg("Task deleted.");
};

const showMsg = (msg) => {
  message.value = msg;
  snackbar.value = true;
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString();
};

onMounted(loadData);
</script>

<style scoped>
/* ✅ 背景 */
.app-container {
  max-width: 700px;
  margin: auto;
  background: #111;
  color: #fff;
  padding: 16px 24px 16px 24px;
  font-family: "Press Start 2P", monospace;
  --pixel-checkbox-size: 24px;
}

.pixel-font,
.pixel-font * {
  font-family: "Press Start 2P", monospace !important;
}

/* header */
.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

/* ✅ quest 卡片標題 */
.app-title {
  color: #00ff00;
  font-size: 12px;
  margin-bottom: 12px;
}

.input-row-top {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

/* ✅ select 不撐滿 */
.input-select {
  width: auto;
  min-width: 120px;
}

.input-row-bottom {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

/* ✅ textarea 吃剩餘空間 */
.quest-textarea {
  flex: 1;
}

/* ✅ 卡片底色 👉 可以在這改（目前已調亮） */
.quest-card {
  background: var(--card-bg); /* ⭐改這裡可以調亮/暗 */
  border: 3px solid #000;
  padding: 10px;
  box-shadow: 4px 4px 0 #000;
  color: white;
}

/* ✅ quest-sub layout */
.quest-sub {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

/* ✅ type chip 外觀 */
.type-chip {
  font-size: 12px !important;
  height: 24px !important;

  /* background: #253042; */
  color: white;

  border: 2px solid #00ff00;
}

/* ✅ 日期 */
.quest-date {
  font-size: 12px;
  color: #aaa;
}

/* ✅ 工作 */
.type-work {
  background: #455a64; /* grey-darken-2 */
}

/* ✅ 家庭 */
.type-home {
  background: #388e3c; /* teal-darken-2 */
}

/* ✅ 個人 */
.type-personal {
  background: #00796b; /* blue-grey-darken-2 */
}

/* row */
.quest-row {
  display: flex;
  align-items: center;
  gap: 12px; /* ✅ 你要求 */
}

/* ✅ 任務內容字體（非pixel） */
.quest-content,
.quest-main {
  font-family: "Microsoft YaHei", Arial, sans-serif;
}

.quest-content {
  flex: 1;
}

.quest-main.done {
  text-decoration: line-through;
  color: #888;
}

.quest-sub {
  font-size: 12px;
  color: #bbb;
}

/* checkbox */
.pixel-checkbox {
  width: var(--pixel-checkbox-size);
  height: var(--pixel-checkbox-size);
  appearance: none;
  border: 3px solid black;
  background: #222;
}

.pixel-checkbox:checked {
  background: #00ff00;
}

/* ✅ 按鈕 */
.pixel-btn {
  font-family: "Press Start 2P", monospace;
  font-size: 12px;

  background: #2ecc00;
  color: white;

  border: 4px solid black;
  box-shadow: inset -3px -3px 0 #1a9900;

  padding: 20px 10px; /* ⭐高度變2倍 + 橫向 padding */
  width: auto; /* ✅ 寬度自適應內容 */
}

/* ✅ 小按鈕（刪除） */
.pixel-btn.small {
  padding: 6px 10px;
  font-size: 10px;
}

/* ✅ 刪除按鈕位置（最右 + 垂直置中） */
.delete-btn {
  margin-left: auto;
  align-self: center;
}

/* ✅ 下拉選單字體 */
.v-select,
.v-field,
.v-field__input {
  font-family: "Microsoft YaHei", Arial, sans-serif !important;
}

/* textarea */
textarea {
  font-family: "Microsoft YaHei", Arial, sans-serif;
}

/* 手機版 */
@media (max-width: 600px) {
  .app-container {
    padding: 12px;
  }
}
</style>
