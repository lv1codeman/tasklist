<template>
  <v-app>
    <v-container class="app-container">
      <!-- ✅ Header -->
      <div class="header">
        <h1>📋 Todo</h1>

        <v-select
          v-model="selectedAccount"
          :items="accounts"
          variant="outlined"
          density="compact"
          hide-details
          class="account-select"
        />
      </div>
      <!-- ✅ 新增任務（像 Notion） -->
      <v-card class="add-card" elevation="2">
        <v-row dense>
          <!-- 手機會自動換行 -->
          <v-col cols="12" sm="3">
            <v-select
              v-model="newTask.account"
              :items="accountsNoAll"
              label="Account"
              variant="outlined"
              density="compact"
            />
          </v-col>

          <v-col cols="12" sm="3">
            <v-select
              v-model="newTask.type"
              :items="types"
              label="Type"
              variant="outlined"
              density="compact"
            />
          </v-col>

          <v-col cols="12" sm="6">
            <v-btn class="pixel-btn" block @click="handleAdd">
              ➕ NEW TASK
            </v-btn>
          </v-col>
        </v-row>
        <v-textarea
          v-model="newTask.task"
          label="新增任務..."
          variant="outlined"
          density="comfortable"
          @keyup.enter="handleAdd"
        ></v-textarea>
      </v-card>

      <!-- ✅ 任務清單 -->
      <div class="task-list">
        <v-fade-transition group>
          <v-card
            v-for="task in filteredTasks"
            :key="task._index"
            class="task-card"
            elevation="2"
          >
            <div class="task-row">
              <!-- checkbox -->
              <v-checkbox
                v-model="task.done"
                density="comfortable"
                @change="toggleDone(task)"
              />

              <!-- 內容 -->
              <div class="task-content">
                <div class="task-meta">
                  <v-chip
                    size="small"
                    :color="typeColor(task.type)"
                    class="mr-2"
                  >
                    {{ task.type }}
                  </v-chip>

                  <span class="date">
                    {{ formatDate(task.date) }}
                  </span>
                </div>
                <div class="task-title" :class="{ done: task.done }">
                  {{ task.task }}
                </div>
              </div>

              <!-- 刪除 -->
              <v-btn
                icon="mdi-delete"
                variant="text"
                @click="confirmDelete(task)"
              />
            </div>
          </v-card>
        </v-fade-transition>
      </div>

      <v-dialog v-model="dialog" width="300">
        <v-card>
          <v-card-title>確認刪除?</v-card-title>

          <v-card-actions>
            <v-spacer />

            <v-btn variant="text" @click="dialog = false"> 取消 </v-btn>

            <v-btn color="red" @click="removeTask"> 刪除 </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Snackbar -->
      <v-snackbar v-model="snackbar">
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

useHead({
  link: [
    {
      href: "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap",
      rel: "stylesheet",
    },
  ],
});

// ✅ 每個 task 各自 debounce（避免互相影響）
const debounceMap = {};

// ✅ 勾選切換（✔ 最終版）

const { fetchTasks, addTask, updateTask, deleteTask } = useTasksApi();

const tasks = ref([]);
const loading = ref(false);

const snackbar = ref(false);
const message = ref("");
const dialog = ref(false);
const deleteTarget = ref(null);

const selectedAccount = ref("All");

const types = ["工作", "家庭", "個人"];

const newTask = ref({
  account: "",
  type: "",
  task: "",
  done: "0",
  date: "",
});

// ✅ 自動產生 account
const accounts = computed(() => {
  const set = new Set(tasks.value.map((t) => t.account));
  return ["All", ...set];
});

const accountsNoAll = computed(() => accounts.value.filter((a) => a !== "All"));

// ✅ 篩選
const filteredTasks = computed(() => {
  if (selectedAccount.value === "All") return tasks.value;
  return tasks.value.filter((t) => t.account === selectedAccount.value);
});

// ✅ 載入
const loadData = async () => {
  loading.value = true;

  const { rows } = await fetchTasks();

  tasks.value = rows.map((row) => ({
    ...row,
    done: row.done === "1" || row.done === 1,
  }));

  loading.value = false;
};

// ✅ 新增
const handleAdd = async () => {
  newTask.value.date = new Date().toISOString();

  await addTask(newTask.value);

  showMsg("新增成功 ✅");

  newTask.value = { account: "", type: "", task: "", done: "0", date: "" };

  loadData();
};

// ✅ done
const toggleDone = (task) => {
  const key = task._index;

  if (debounceMap[key]) {
    debounceMap[key].cancel();
  }

  debounceMap[key] = debounce(async () => {
    try {
      const { _index, ...data } = task;

      data.done = task.done ? "1" : "0";

      await updateTask(_index, data);

      showMsg("已更新 ✅");
    } catch (err) {
      console.error(err);

      // rollback（失敗還原）
      task.done = !task.done;

      showMsg("更新失敗 ❌");
    }
  }, 500);

  debounceMap[key]();
};

// ✅ 刪除
const confirmDelete = (task) => {
  deleteTarget.value = task;
  dialog.value = true;
};

const removeTask = async () => {
  const target = deleteTarget.value;

  // ✅ UI先移除（樂觀）
  tasks.value = tasks.value.filter((t) => t._index !== target._index);

  dialog.value = false;

  try {
    await deleteTask(target._index);

    showMsg("已刪除 ✅");
  } catch (err) {
    showMsg("刪除失敗 ❌");

    // ❗ rollback（失敗還原）
    loadData();
  }
};

// ✅ UI helpers
const showMsg = (msg) => {
  message.value = msg;
  snackbar.value = true;
};

const typeColor = (type) => {
  return (
    {
      工作: "blue",
      家庭: "green",
      個人: "orange",
    }[type] || "grey"
  );
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString();
};

onMounted(loadData);
</script>
<style scoped>
.app-container {
  max-width: 700px;
  margin: auto;
  padding: 16px;
}

/* header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.account-select {
  width: 140px;
}

/* 新增卡片 */
.add-card {
  padding: 16px;
  margin-bottom: 24px;
  border-radius: 12px;
}

/* 任務 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  border-radius: 12px;
  padding: 12px 16px;
}

/* row */
.task-row {
  display: flex;
  align-items: center;
}

/* 內容 */
.task-content {
  flex: 1;
}

/* 標題 */
.task-title {
  font-size: 16px;
}

.task-title.done {
  text-decoration: line-through;
  opacity: 0.5;
}

/* meta */
.task-meta {
  font-size: 12px;
  color: gray;
  margin-top: 4px;
}

.date {
  margin-left: 4px;
}
.pixel-btn {
  font-family: "Press Start 2P", monospace;
  font-size: 12px;
  background: #2ecc00;
  color: white;
  border: 4px solid black;
  border-radius: 6px;
  box-shadow: inset -4px -4px 0 #1a9900;
  padding: 14px;
  transition: all 0.1s ease;
}

/* hover */
.pixel-btn:hover {
  background: #36ff00;
  transform: translateY(-1px);
}

/* 按下效果（像遊戲按鈕） */
.pixel-btn:active {
  transform: translateY(2px);
  box-shadow: inset 4px 4px 0 #1a9900;
}
/* 📱 手機優化 */
@media (max-width: 600px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .account-select {
    width: 100%;
  }

  .task-row {
    align-items: flex-start;
  }

  .task-content {
    margin-left: 8px;
  }
}
</style>
