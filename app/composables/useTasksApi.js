export const useTasksApi = () => {
  const API_URL =
    "https://script.google.com/macros/s/AKfycbz0x7NwLAIPIq2Wl-WcrYVNGhP1MD6VIJID0XAdg3EGDZNYmQIQevXQR2m6EXU9TsZYdA/exec";

  // ✅ 讀取
  const fetchTasks = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();

    const headers = data[0];

    const rows = data.slice(1).map((row, i) => {
      const obj = { _index: i + 2 }; // 對應 sheet row
      headers.forEach((key, index) => {
        obj[key] = row[index];
      });
      return obj;
    });

    return { headers, rows };
  };

  // ✅ 新增
  const addTask = async (taskObj) => {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "add",
        data: taskObj,
      }),
    });
  };

  // ✅ 更新
  const updateTask = async (rowIndex, updatedData) => {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "update",
        index: rowIndex,
        data: updatedData,
      }),
    });
  };

  // ✅ 刪除
  const deleteTask = async (rowIndex) => {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "delete",
        index: rowIndex,
      }),
    });
  };

  return {
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
  };
};
