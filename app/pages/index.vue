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
      <div class="quest-list mt-4 rounded-lg">
        <div class="quest-title">QUEST LOG</div>

        <!-- ✅ ✅ Vuetify 分頁（僅新增這裡） -->
        <v-tabs v-model="currentTab" class="mb-2" grow>
          <v-tab value="CURRENT">CURRENT</v-tab>
          <v-tab value="FINISHED">FINISHED</v-tab>
        </v-tabs>

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

const currentTab = ref("CURRENT"); // ✅ 新增

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

/* ✅ display邏輯（唯一改動） */
const rebuildDisplayList = () => {
  let list = [...tasks.value];

  if (selectedAccount.value !== "All") {
    list = list.filter((t) => t.account === selectedAccount.value);
  }

  // ✅ ✅ 分頁
  if (currentTab.value === "CURRENT") {
    list = list.filter((t) => !t.done);
  } else {
    list = list.filter((t) => t.done);
  }

  list.sort((a, b) => a.order - b.order);

  displayList.value = list;
};

/* load */
const loadData = async () => {
  const res = await fetchTasks();
  const data = res.rows;

  tasks.value = data.map((obj) => ({
    ...obj,
    done: obj.done === "1" || obj.done === 1 || obj.done === true,
    order: Number(obj.order) || 0,
  }));

  rebuildDisplayList();
};

/* drag */
const handleDragStart = () => {
  isDragging.value = true;
};

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

  rebuildDisplayList();
};

/* create */
const submitQuest = async () => {
  const orders = tasks.value.map((t) => Number(t.order) || 0);
  const max = orders.length ? Math.max(...orders) : -1;

  await addTask({
    id: Date.now().toString(),
    account: newQuest.value.account,
    type: newQuest.value.type,
    task: newQuest.value.task,
    done: "0",
    date: new Date().toISOString(),
    order: max + 1,
  });

  dialogAdd.value = false;
  await loadData();
};

/* toggle */
const debounceMap = {};

const toggleDone = (task) => {
  const key = task.id;

  if (debounceMap[key]) debounceMap[key].cancel();

  debounceMap[key] = debounce(async () => {
    await updateTask({
      ...task,
      done: task.done ? "1" : "0",
    });

    rebuildDisplayList();
  }, 300);

  debounceMap[key]();
};

const handleCardClick = (task) => {
  if (isDragging.value) return;

  task.done = !task.done;
  rebuildDisplayList();
  toggleDone(task);
};

/* delete */
const confirmDelete = (task) => {
  deleteTarget.value = task;
  dialog.value = true;
};

const removeTask = async () => {
  await deleteTask({ id: deleteTarget.value.id });
  await loadData();
  dialog.value = false;
};
const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString() : "";
};
watch([selectedAccount, currentTab], rebuildDisplayList);

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
.quest-list {
  border: 3px solid white;
  padding: 5px;
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
