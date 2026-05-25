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
          variant="outlined"
          class="custom-select"
        />
      </div>

      <!-- LIST -->
      <div class="quest-list mt-4 rounded-lg">
        <!-- ✅ title row -->
        <div class="quest-title-row">
          <div class="quest-title-text">QUEST LOG</div>

          <v-btn
            class="pixel-btn delete-batch-btn"
            @click="deleteSelected"
            v-show="selectedIds.size"
          >
            DELETE ({{ selectedIds.size }})
          </v-btn>
        </div>

        <!-- tabs -->
        <v-tabs v-model="currentTab" class="mb-2 pixel-tabs" grow>
          <v-tab value="CURRENT">CURRENT</v-tab>
          <v-tab value="FINISHED">FINISHED</v-tab>
        </v-tabs>

        <!-- list -->
        <draggable
          v-model="displayList"
          item-key="id"
          handle=".quest-content-area"
          :delay-on-touch-only="true"
          :delay="1000"
          @start="handleDragStart"
          @end="handleDragEnd"
        >
          <template #item="{ element: task }">
            <div
              class="quest-card"
              :class="{ selected: selectedIds.has(task.id) }"
              :style="{ '--card-bg': getColor(task.type) }"
            >
              <div class="quest-row">
                <!-- checkbox -->
                <div class="checkbox-area" @click.stop="selectForDelete(task)">
                  <input
                    type="checkbox"
                    :checked="selectedIds.has(task.id)"
                    readonly
                    class="pixel-checkbox"
                  />
                </div>

                <!-- content -->
                <div class="quest-content-area" @click="handleCardClick(task)">
                  <div class="quest-main" :class="{ done: task.done }">
                    {{ task.task }}
                  </div>

                  <div class="quest-sub">
                    <v-chip
                      size="small"
                      class="type-chip"
                      :style="{
                        backgroundColor: getTypeStyle(task.type),
                      }"
                    >
                      {{ task.type }}
                    </v-chip>

                    <span class="quest-date">
                      {{ formatDate(task.date) }}
                    </span>
                  </div>
                </div>

                <!-- edit -->
                <button class="edit-btn" @click.stop="openEdit(task)">
                  ✏️
                </button>

                <!-- delete -->
                <button class="delete-btn" @click.stop="confirmDelete(task)">
                  ✕
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
              class="custom-select"
            />
            <v-select
              v-model="newQuest.type"
              class="custom-select"
              :items="types"
              label="Type"
            />
            <v-textarea
              class="custom-select"
              v-model="newQuest.task"
              label="QUEST"
            />
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn @click="dialogAdd = false">CANCEL</v-btn>
            <v-btn class="pixel-btn" @click="submitQuest"> CREATE </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- EDIT DIALOG -->
      <v-dialog v-model="dialogEdit" width="500" class="pixel-font">
        <v-card>
          <v-card-title>EDIT QUEST</v-card-title>

          <v-card-text>
            <!-- Type -->
            <v-select
              v-model="editTarget.type"
              :items="types"
              label="Type"
              class="custom-select"
            />

            <!-- Content -->
            <v-textarea
              v-model="editTarget.task"
              label="QUEST"
              class="custom-select"
            />
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn @click="dialogEdit = false">CANCEL</v-btn>
            <v-btn class="pixel-btn" @click="submitEdit">SAVE</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- DELETE -->
      <v-dialog v-model="dialog" width="320">
        <v-card class="custom-dialog">
          <!-- title -->
          <v-card-title class="dialog-title"> DELETE QUEST? </v-card-title>

          <!-- subtitle -->
          <v-card-text class="dialog-text">
            This action cannot be undone.
          </v-card-text>

          <!-- actions -->
          <v-card-actions class="dialog-actions">
            <v-spacer />

            <v-btn
              size="small"
              class="pixel-btn-outline"
              variant="outlined"
              @click="dialog = false"
            >
              CANCEL
            </v-btn>

            <v-btn
              size="small"
              class="pixel-btn delete-main-btn"
              variant="elevated"
              @click="removeTask"
            >
              DELETE
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar v-model="snackbar" class="pixel-snackbar" location="center">
        <div class="text-center w-100">
          {{ message }}
        </div>
      </v-snackbar>
    </v-container>
  </v-app>
  <v-overlay
    :model-value="loading"
    class="d-flex align-center justify-center"
    persistent
  >
    <div class="d-flex flex-column align-center">
      <v-progress-circular indeterminate size="64" color="pink" />
      <!-- <div class="mt-3 text-pink text-center w-100">Data updating...</div> -->
    </div>
  </v-overlay>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useTasksApi } from "@/composables/useTasksApi";
import draggable from "vuedraggable";

const { fetchTasks, addTask, updateTask, deleteTask, batchUpdateTasks } =
  useTasksApi();

const tasks = ref([]);
const displayList = ref([]);
const selectedIds = ref(new Set());
const currentTab = ref("CURRENT");
const selectedAccount = ref("All");

const dialog = ref(false);
const dialogAdd = ref(false);
const deleteTarget = ref(null);

const pressTimer = ref(null);
const isLongPress = ref(false);

const isDragging = ref(false);

const types = ["工作", "家庭", "個人"];
const newQuest = ref({ account: "", type: "", task: "" });

const snackbar = ref(false);
const message = ref("");
const loading = ref(false);
const dialogEdit = ref(false);
const editTarget = ref(null);

const openEdit = (task) => {
  editTarget.value = { ...task }; // ✅ copy，避免直接改原資料
  dialogEdit.value = true;
};

const submitEdit = async () => {
  await withLoading(async () => {
    // ✅ 1. 更新本地 tasks
    tasks.value = tasks.value.map((t) =>
      t.id === editTarget.value.id ? { ...t, ...editTarget.value } : t
    );

    rebuildDisplayList(); // ✅ 更新畫面

    // ✅ 2. 打 API
    await updateTask({
      ...editTarget.value,
      done: editTarget.value.done ? "1" : "0",
    });
  });

  dialogEdit.value = false;
};

const showMessage = (msg) => {
  message.value = msg;
  snackbar.value = true;
};

const withLoading = async (fn) => {
  loading.value = true;
  try {
    return await fn();
  } finally {
    loading.value = false;
  }
};

/* color */
const getColor = (type) => {
  return (
    {
      工作: "#f3d9fa", // 淡紫粉
      家庭: "#ffe5d9", // 奶油粉
      個人: "#d9f0ff", // 粉藍
    }[type] || "#ffe4ec"
  );
};

const getTypeStyle = (type) => {
  return (
    {
      工作: "#d4a5f9",
      家庭: "#ffb5a7",
      個人: "#a0d8ff",
    }[type] || "#ffb3c6"
  );
};

/* account */
const accounts = computed(() => {
  const set = new Set(tasks.value.map((t) => t.account));
  return ["All", ...set];
});
const accountsNoAll = computed(() => accounts.value.filter((a) => a !== "All"));

/* display */
const rebuildDisplayList = () => {
  let list = [...tasks.value];

  if (selectedAccount.value !== "All") {
    list = list.filter((t) => t.account === selectedAccount.value);
  }

  list =
    currentTab.value === "CURRENT"
      ? list.filter((t) => !t.done)
      : list.filter((t) => t.done);

  displayList.value = list.sort((a, b) => a.order - b.order);
};

/* load */
const loadData = async () => {
  showMessage("Data loading...");
  await withLoading(async () => {
    const res = await fetchTasks();
    tasks.value = res.rows.map((obj) => ({
      ...obj,
      done: obj.done === "1" || obj.done === 1 || obj.done === true,
      order: Number(obj.order) || 0,
    }));
    rebuildDisplayList();
  });
  snackbar.value = false;
};

/* click */
const handleCardClick = (task) => {
  if (isDragging.value) return;
  task.done = !task.done;
  rebuildDisplayList();
  updateTask({ ...task, done: task.done ? "1" : "0" }).catch(() => {
    // ❗ 如果失敗 rollback
    task.done = !task.done;
    rebuildDisplayList();
  });
};

const handleDragStart = () => {
  isDragging.value = true;
};

const handleDragEnd = async () => {
  isDragging.value = false;
  // ✅ 1. 用畫面順序更新 order
  displayList.value.forEach((task, index) => {
    task.order = index;
  });

  // ✅ 2. 同步回 tasks（這步很關鍵🔥）
  tasks.value = tasks.value.map((t) => {
    const updated = displayList.value.find((d) => d.id === t.id);
    return updated ? { ...t, order: updated.order } : t;
  });

  // ✅ 3. 打 API
  batchUpdateTasks(tasks.value).catch(console.error);

  // ✅ 4. 重新整理畫面
  rebuildDisplayList();
};

/* select */
const selectForDelete = (task) => {
  if (selectedIds.value.has(task.id)) {
    selectedIds.value.delete(task.id);
  } else {
    selectedIds.value.add(task.id);
  }
};

/* delete */
const deleteSelected = async () => {
  const ids = new Set(selectedIds.value);

  // ✅ 1. 先刪畫面
  tasks.value = tasks.value.filter((t) => !ids.has(t.id));
  rebuildDisplayList();
  selectedIds.value.clear();

  // ✅ 2. 平行打 API（更快🔥）
  await Promise.all([...ids].map((id) => deleteTask({ id })));
};

const confirmDelete = (task) => {
  deleteTarget.value = task;
  dialog.value = true;
};

const removeTask = async () => {
  const id = deleteTarget.value.id;

  // ✅ 1. 先刪畫面
  tasks.value = tasks.value.filter((t) => t.id !== id);
  rebuildDisplayList();

  dialog.value = false;

  // ✅ 2. 打 API
  await deleteTask({ id });
};

const submitQuest = async () => {
  const newTask = {
    id: Date.now().toString(),
    ...newQuest.value,
    done: false,
    date: new Date().toISOString(),
    order: tasks.value.length,
  };

  tasks.value.push(newTask);
  rebuildDisplayList();
  dialogAdd.value = false;
  await addTask(newTask);
};

const formatDate = (d) => new Date(d).toLocaleDateString();

watch([selectedAccount, currentTab], rebuildDisplayList);
onMounted(loadData);
</script>
<style scoped>
.app-container {
  max-width: 700px;
  margin: auto;
  background: #fff0f5;
  color: #444;
  padding: 16px;
  border-radius: 16px;
}

/* header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* list */
.quest-list {
  border: 2px solid #ffc2d1;
  padding: 8px;
  background: #fff;
}

/* title */
.quest-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 40px;
}

.quest-title-text {
  font-weight: bold;
  color: #d63384;
}

/* card */
.quest-card {
  background: var(--card-bg);
  border: 2px solid #ffc2d1;
  padding: 10px;
  margin-top: 8px;
  border-radius: 12px;
  transition: 0.2s;
}

.quest-card:hover {
  transform: translateY(-2px);
}

.quest-card.selected {
  border: 2px solid #ff99bb;
  box-shadow: 0 0 10px rgba(255, 153, 187, 0.5);
}

/* row */
.quest-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* checkbox */
.checkbox-area {
  padding: 6px;
  cursor: pointer;
}

.pixel-checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid #ff99bb;
  border-radius: 6px;
}

.pixel-checkbox:checked {
  background: #ff66a3;
}

/* content */
.quest-content-area {
  flex: 1;
  cursor: pointer;
}

.quest-main.done {
  text-decoration: line-through;
  color: #aaa;
}

/* sub */
.quest-sub {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: #888;
}

/* delete */
.delete-btn {
  background: #ff4d88;
  color: white;
  border: 2px solid #ff6699;
  padding: 4px 8px;
  border-radius: 8px;
}

.delete-btn:hover {
  background: #ff1a66;
}

/* buttons */
.pixel-btn {
  background: #ff99bb;
  color: #fff;
  border: none;
  padding: 6px 10px;
  border-radius: 10px;
}

.pixel-btn-outline {
  color: #7a7a7a;
  border-color: #b8b8b8;
  padding: 6px 10px;
  border-radius: 10px;
}

.pixel-btn:hover {
  background: #ff66a3;
}

/* tabs */
.pixel-tabs .v-tab.v-tab--selected {
  color: #ff4d88;
  font-weight: bold;
}

.type-chip {
  color: white;
  font-size: 10px;
  border-radius: 999px;
  padding: 2px 8px;
}

.quest-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 182, 193, 0.4);
}

/* ✅ 被拖起來的卡片（最重要🔥） */
.sortable-chosen {
  transform: scale(1.05) rotate(1deg);
  box-shadow: 0 0 12px rgba(255, 105, 180, 0.7),
    0 0 25px rgba(255, 182, 193, 0.9), 6px 6px 0 rgba(0, 0, 0, 0.2);

  z-index: 10;
  opacity: 1 !important;
  /* background: #fff0f5 !important; */
}

/* ✅ 拖曳中的樣子 */
.sortable-drag {
  transform: scale(1.05);
  z-index: 1000;
}

/* ✅ 留在原地的影子（弱化） */
.sortable-ghost {
  opacity: 0.2;
  /* filter: blur(1px); */
}

.sortable-chosen,
.sortable-drag {
  cursor: grab !important;
}

/* 自訂select外觀-----------------------------------------------------*/

/* ✅ 主外框（你自己的） */
.custom-select :deep(.v-field) {
  border-radius: 12px;
  background: #fff;
  border: 2px solid #ffc2d1;
  box-shadow: none;
}

/* ✅ ❌ 關掉 Vuetify 預設 outline（最關鍵🔥） */
.custom-select :deep(.v-field__outline) {
  display: none;
}

/* ✅ hover */
.custom-select :deep(.v-field:hover) {
  border-color: #ff99bb;
  background: #fff0f5;
}

/* ✅ focus */
.custom-select :deep(.v-field--active) {
  border-color: #ff66a3 !important;
  box-shadow: 0 0 6px rgba(255, 105, 135, 0.3);
}

/* ✅ 內部背景修正（避免灰色） */
.custom-select :deep(.v-field__overlay) {
  background: transparent;
}

/* ✅ label */
.custom-select :deep(.v-label) {
  color: #d63384;
}

/* ✅ icon */
.custom-select :deep(.v-icon) {
  color: #ff66a3;
}

/* ✅ dialog 卡片 */
.custom-dialog {
  border-radius: 16px;
  border: 2px solid #ffc2d1;
  background: #fff0f5;
  padding: 8px;
}

/* ✅ 標題 */
.dialog-title {
  font-weight: bold;
  font-size: 16px;
  color: #d63384;
  text-align: center;
}

/* ✅ 說明文字 */
.dialog-text {
  font-size: 14px;
  color: #888;
  text-align: left;
  margin-top: -8px;
}

/* ✅ 按鈕區 */
.dialog-actions {
  margin-top: 8px;
  gap: 8px;
}
.v-overlay__content {
  transition: pop-in 0.2s ease;
}

.edit-btn {
  background: #ffddb0;
  color: white;
  border: 2px solid #f3be9b;
  padding: 5px 5px;
  border-radius: 8px;
}

.edit-btn:hover {
  background: #ffb84d;
}

@keyframes pop-in {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>

<style>
/* ✅ 下拉整體 */
.v-overlay-container .v-list {
  background: #fff !important;
  border: 2px solid #ffc2d1;
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 4px 12px rgba(255, 182, 193, 0.3); /* ✅ 柔粉陰影 */
}

/* ✅ 每個選項 */
.v-overlay-container .v-list-item {
  border-radius: 8px;
  color: #555;
}

/* ✅ hover（重點✨） */
.v-overlay-container .v-list-item:hover {
  background: #fff0f5 !important;
}

/* ✅ 被選中 */
.v-overlay-container .v-list-item--active {
  background: #ffe4ec !important;
}

/* ✅ 移除奇怪 overlay（有些版本會有） */
.v-overlay-container .v-overlay__content {
  box-shadow: none !important;
}

/* ✅ optional：修正字型間距 */
.v-overlay-container .v-list-item-title {
  font-size: 14px;
}
.v-overlay-container .v-overlay__content {
  background: transparent !important; /* ✅ 關掉灰底 */
  box-shadow: none !important; /* ✅ 移除預設陰影 */
  border: none !important;
  padding: 0; /* ✅ 很關鍵 */
}

.v-overlay-container .v-select__content {
  background: transparent !important;
}

.v-overlay-container .v-sheet {
  background: transparent !important;
}
.v-overlay-container .v-sheet {
  background: transparent !important;
}

.v-snackbar__wrapper > .v-snackbar__content {
  background: #fdd9e5; /* 淡粉底 */
  border: 2px solid #ff99bb;
  border-radius: 12px;
  color: #d81c7a;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(255, 182, 193, 0.4);
  margin-top: 15vh;
}
</style>
