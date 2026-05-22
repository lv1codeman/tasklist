<template>
  <v-app>
    <v-container class="app-container rounded-lg">
      <!-- HEADER -->
      <div class="header">
        <h1>QUEST LIST</h1>

        <v-btn class="pixel-btn" @click="dialogAdd = true"> NEW QUEST </v-btn>
      </div>

      <!-- FILTER -->
      <div class="filter-row">
        <v-select
          v-model="selectedAccount"
          :items="accounts"
          label="Show"
          hide-details
        />
      </div>

      <!-- LIST -->
      <div class="quest-list">
        <div class="quest-title">QUEST LOG</div>

        <draggable
          v-model="displayList"
          item-key="id"
          :delay="300"
          :delay-on-touch-only="true"
          @start="handleDragStart"
          @end="handleDragEnd"
        >
          <template #item="{ element: task }">
            <div
              class="quest-card"
              :style="{ '--card-bg': getColor(task.type) }"
              @click="handleCardClick(task)"
            >
              <div class="quest-row">
                <input
                  type="checkbox"
                  v-model="task.done"
                  @click.stop
                  @change="toggleDone(task)"
                  class="pixel-checkbox"
                />

                <div class="quest-content">
                  <div class="quest-main" :class="{ done: task.done }">
                    {{ task.task }}
                  </div>

                  <div class="quest-sub pixel-font">
                    <v-chip
                      size="small"
                      class="type-chip pixel-font"
                      :style="{
                        borderColor: getTypeStyle(task.type),
                        backgroundColor: getTypeStyle(task.type),
                      }"
                    >
                      {{ task.type }}
                    </v-chip>

                    <span class="quest-date pixel-font">
                      {{ formatDate(task.date) }}
                    </span>
                  </div>
                </div>

                <button
                  class="pixel-btn small delete-btn"
                  @click.stop="confirmDelete(task)"
                >
                  X
                </button>
              </div>
            </div>
          </template>
        </draggable>
      </div>

      <!-- ADD -->
      <v-dialog v-model="dialogAdd" width="500" class="pixel-font">
        <v-card>
          <v-card-title>NEW QUEST</v-card-title>

          <v-card-text>
            <v-combobox
              v-model="newQuest.account"
              :items="accountsNoAll"
              label="Account"
              clearable
              hide-details
            />

            <v-select v-model="newQuest.type" :items="types" label="Type" />

            <v-textarea
              v-model="newQuest.task"
              label="QUEST"
              rows="2"
              auto-grow
            />
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn @click="dialogAdd = false">CANCEL</v-btn>
            <v-btn class="pixel-btn" @click="submitQuest">CREATE</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- DELETE -->
      <v-dialog v-model="dialog" width="300" class="pixel-font">
        <v-card>
          <v-card-title>DELETE TASK?</v-card-title>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="dialog = false">CANCEL</v-btn>
            <v-btn color="red" @click="removeTask">DELETE</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- SNACK -->
      <v-snackbar v-model="snackbar">
        {{ message }}
      </v-snackbar>
    </v-container>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useTasksApi } from "@/composables/useTasksApi";
import { debounce } from "lodash-es";
import draggable from "vuedraggable";
import { useHead } from "#imports";

useHead({
  link: [
    {
      href: "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap",
      rel: "stylesheet",
    },
  ],
});

const { fetchTasks, addTask, updateTask, deleteTask, batchUpdateTasks } =
  useTasksApi();

const tasks = ref([]);
const displayList = ref([]);
const isDragging = ref(false);

const snackbar = ref(false);
const message = ref("");
const dialog = ref(false);
const dialogAdd = ref(false);
const deleteTarget = ref(null);

const selectedAccount = ref("All");

const types = ["工作", "家庭", "個人"];

const newQuest = ref({
  account: "",
  type: "",
  task: "",
});

/* 顏色 */
const getColor = (type) =>
  ({
    工作: "#424242",
    家庭: "#00695c",
    個人: "#37474f",
  }[type] || "#2a2a2a");

const getTypeStyle = (type) =>
  ({
    工作: "#212121",
    家庭: "#004D40",
    個人: "#263238",
  }[type]);

/* accounts */
const accounts = computed(() => {
  const set = new Set(tasks.value.map((t) => t.account));
  return ["All", ...set];
});

const accountsNoAll = computed(() => accounts.value.filter((a) => a !== "All"));

/* ✅ 重建畫面清單 */
const rebuildDisplayList = () => {
  let list = [...tasks.value];

  if (selectedAccount.value !== "All") {
    list = list.filter((t) => t.account === selectedAccount.value);
  }

  list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.order - b.order;
  });

  displayList.value = list;
};

/* load */
const loadData = async () => {
  const res = await fetchTasks();

  console.log("API response:", res);

  // ✅ 直接用 rows（已經是 object）
  const data = res.rows;

  if (!data || data.length === 0) {
    tasks.value = [];
    return;
  }

  tasks.value = data.map((obj) => {
    return {
      ...obj,
      done: obj.done === "1" || obj.done === 1 || obj.done === true,
      order: Number(obj.order) || 0,
    };
  });

  console.log("tasks:", tasks.value);

  rebuildDisplayList();
};

/* ✅ 拖曳開始 */
const handleDragStart = () => {
  isDragging.value = true;
  if (navigator.vibrate) navigator.vibrate(30);
};

/* ✅ 拖曳結束 */
const handleDragEnd = async () => {
  isDragging.value = false;

  displayList.value.forEach((task, i) => {
    task.order = i;
  });

  displayList.value.forEach((d) => {
    const t = tasks.value.find((t) => t.id === d.id);
    if (t) t.order = d.order;
  });

  await batchUpdateTasks(tasks.value);

  showMsg("Order updated ✅");

  rebuildDisplayList();
};

/* ✅ 新增 */
const submitQuest = async () => {
  if (!newQuest.value.task.trim()) {
    showMsg("請輸入任務 ❗");
    return;
  }
  if (!newQuest.value.account) {
    showMsg("請輸入 Account ❗");
    return;
  }

  // ✅ ✅ ✅ 計算最大 order
  const orders = tasks.value.map((t) => Number(t.order) || 0);
  const maxOrder = orders.length ? Math.max(...orders) : -1;

  // ✅ ✅ ✅ 新任務放最後
  const newItem = {
    id: Date.now().toString(),
    account: newQuest.value.account.trim(),
    type: newQuest.value.type,
    task: newQuest.value.task.trim(),
    done: "0",
    date: new Date().toISOString(),
    order: maxOrder + 1, // ⭐⭐這行是關鍵⭐⭐
  };
  await addTask(newItem);
  dialogAdd.value = false;
  newQuest.value = { account: "", type: "", task: "" };
  await loadData();
};

/* ✅ 點擊卡片 */
const handleCardClick = (task) => {
  if (isDragging.value) return;
  task.done = !task.done;
  toggleDone(task);
};

/* ✅ 勾選 */
const toggleDone = (task) => {
  if (task.done) {
    // ✅ 找目前最大 order
    const maxOrder = Math.max(...tasks.value.map((t) => t.order || 0));

    task.order = maxOrder + 1;
  }

  const key = task.id;
  if (debounceMap[key]) {
    debounceMap[key].cancel();
  }
  debounceMap[key] = debounce(async () => {
    try {
      await updateTask({
        ...task,
        done: task.done ? "1" : "0",
        order: task.order,
      });

      showMsg("Updated ✅");
      rebuildDisplayList();
    } catch {
      task.done = !task.done;
      showMsg("Failed ❌");
    }
  }, 400);

  debounceMap[key]();
};

/* 刪除 */
const confirmDelete = (task) => {
  deleteTarget.value = task;
  dialog.value = true;
};

const removeTask = async () => {
  const task = deleteTarget.value;

  tasks.value = tasks.value.filter((t) => t.id !== task.id);

  dialog.value = false;

  await deleteTask({ id: task.id });

  rebuildDisplayList();
};

/* UI */
const showMsg = (msg) => {
  message.value = msg;
  snackbar.value = true;
};

const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : "");

const debounceMap = {};

watch(selectedAccount, () => {
  rebuildDisplayList();
});

onMounted(loadData);
</script>

<style scoped>
.app-container {
  max-width: 700px;
  margin: auto;
  background: #111;
  color: #fff;
  padding: 16px;
  font-family: "Press Start 2P", monospace;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.quest-card {
  background: var(--card-bg);
  border: 3px solid black;
  padding: 10px;
  margin-top: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quest-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quest-content {
  flex: 1;
  font-family: "Microsoft YaHei", Arial, sans-serif;
}

.quest-main.done {
  text-decoration: line-through;
}

.quest-sub {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.pixel-checkbox {
  width: 24px;
  height: 24px;
  appearance: none;
  border: 3px solid black;
}

.pixel-checkbox:checked {
  background: #00ff00;
}

.pixel-btn {
  background: #2ecc00;
  border: 4px solid black;
  padding: 12px;
}

.delete-btn {
  margin-left: auto;
}

/* ✅ 被抓起來 */
.sortable-chosen {
  transform: scale(1.05) rotate(1deg);
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.6), 0 0 20px rgba(0, 255, 0, 0.3),
    6px 6px 0 black;
  cursor: grabbing;
  z-index: 10;
}

/* ✅ 拖曳影子 */
.sortable-ghost {
  opacity: 0.4;
  transform: scale(0.98);

  filter: brightness(0.8);
}
@keyframes drag-shake {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(1.08) rotate(-1deg);
  }
  60% {
    transform: scale(1.05) rotate(1deg);
  }
  100% {
    transform: scale(1.05);
  }
}

/* ✅ 套到 chosen 時 */
.sortable-chosen {
  animation: drag-shake 0.2s ease;
}
</style>
