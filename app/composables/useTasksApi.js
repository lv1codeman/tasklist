export const useTasksApi = () => {
  const API_URL =
    "https://script.google.com/macros/s/AKfycbz0x7NwLAIPIq2Wl-WcrYVNGhP1MD6VIJID0XAdg3EGDZNYmQIQevXQR2m6EXU9TsZYdA/exec";

  /* ✅ GET（不用改） */
  const fetchTasks = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();

    // ✅ 你現在 GAS 是 object 格式
    return {
      headers: data.headers,
      rows: data.rows,
    };
  };

  /* ✅ ✅ 共用：form POST */
  const post = async (payloadObj) => {
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        payload: JSON.stringify(payloadObj),
      }),
    });
  };

  /* ✅ 新增 */
  const addTask = async (taskObj) => {
    await post({
      action: "add",
      data: taskObj,
    });
  };

  /* ✅ 更新（✅改用 id） */
  const updateTask = async (taskObj) => {
    await post({
      action: "update",
      data: taskObj,
    });
  };

  /* ✅ 批次更新 */
  const batchUpdateTasks = async (tasks) => {
    await post({
      action: "batchUpdate",
      data: tasks,
    });
  };

  /* ✅ 刪除（✅用 id） */
  const deleteTask = async ({ id }) => {
    await post({
      action: "delete",
      data: { id },
    });
  };

  return {
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    batchUpdateTasks,
  };
};
