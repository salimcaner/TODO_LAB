  const API_BASE_URL = "http://127.0.0.1:8000";

  // Token kontrolü - sayfa yüklendiğinde
  window.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      // Token yoksa login sayfasına yönlendir
      console.log("Token bulunamadı, login sayfasına yönlendiriliyor...");
      window.location.href = "../login/login.html";
      return;
    }
    // Token varsa todo'ları yükle
    console.log("Token bulundu, todo'lar yükleniyor...");
    await loadTodos();
  });

  // TODO OLUŞTURMA
  async function createTodo(title) {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Lütfen önce giriş yapın!");
      window.location.href = "../login/login.html";
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/todos`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, completed: false }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Todo oluşturulamadı");
      }

      const data = await res.json();
      console.log("Todo oluşturuldu:", data);
      return data;
    } catch (error) {
      console.error("Todo oluşturma hatası:", error);
      alert(`Hata: ${error.message}`);
      throw error;
    }
  }

  // TODO LİSTELEME
  async function getTodos() {
    const token = localStorage.getItem("token");
    if (!token) {
      return [];
    }

    try {
      const res = await fetch(`${API_BASE_URL}/todos`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Token geçersiz, login sayfasına yönlendir
          localStorage.removeItem("token");
          window.location.href = "../login/login.html";
          return [];
        }
        const error = await res.json();
        throw new Error(error.detail || "Todo'lar yüklenemedi");
      }

      const todos = await res.json();
      return todos;
    } catch (error) {
      console.error("Todo listeleme hatası:", error);
      alert(`Hata: ${error.message}`);
      return [];
    }
  }

  // TODO DURUMU DEĞİŞTİRME (Toggle)
  async function toggleTodo(todoId) {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Lütfen önce giriş yapın!");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/todos/${todoId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Todo güncellenemedi");
      }

      const data = await res.json();
      console.log("Todo güncellendi:", data);
      return data;
    } catch (error) {
      console.error("Todo güncelleme hatası:", error);
      alert(`Hata: ${error.message}`);
      throw error;
    }
  }

  // TODO SİLME
  async function deleteTodo(todoId) {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Lütfen önce giriş yapın!");
      return;
    }

    if (!confirm("Bu görevi silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/todos/${todoId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Todo silinemedi");
      }

      const data = await res.json();
      console.log("Todo silindi:", data);
      return data;
    } catch (error) {
      console.error("Todo silme hatası:", error);
      alert(`Hata: ${error.message}`);
      throw error;
    }
  }

  // TODO'LARI EKRANDA GÖSTER
  function displayTodos(todos) {
    const todoListContainer = document.getElementById("todoList");
    if (!todoListContainer) {
      console.error("Todo list container bulunamadı!");
      return;
    }

    if (todos.length === 0) {
      todoListContainer.innerHTML = '<p class="no-todos">Henüz görev eklenmemiş.</p>';
      return;
    }

    todoListContainer.innerHTML = todos
      .map(
        (todo) => `
      <div class="todo-item ${todo.completed ? "completed" : ""}" data-id="${todo.id}">
        <input 
          type="checkbox" 
          class="todo-checkbox" 
          ${todo.completed ? "checked" : ""}
          onchange="toggleTodoHandler('${todo.id}')"
        >
        <span class="todo-title">${escapeHtml(todo.title)}</span>
        <button class="todo-delete-btn" onclick="deleteTodoHandler('${todo.id}')" title="Sil">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `
      )
      .join("");
  }

  // HTML escape fonksiyonu (XSS koruması)
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // TODO'LARI YÜKLE VE GÖSTER
  async function loadTodos() {
    const todos = await getTodos();
    displayTodos(todos);
  }

  // Event handler'lar (global scope'ta olmalı)
  window.toggleTodoHandler = async function (todoId) {
    try {
      await toggleTodo(todoId);
      await loadTodos(); // Listeyi yenile
    } catch (error) {
      // Hata zaten alert ile gösterildi
    }
  };

  window.deleteTodoHandler = async function (todoId) {
    try {
      await deleteTodo(todoId);
      await loadTodos(); // Listeyi yenile
    } catch (error) {
      // Hata zaten alert ile gösterildi
    }
  };

  // Form submit handler
  const todoForm = document.querySelector(".frmGorev");
  const todoInput = document.querySelector(".frmGorev .text");

  if (todoForm) {
    todoForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = todoInput.value.trim();
      if (!title) {
        alert("Lütfen bir görev başlığı girin!");
        return;
      }

      try {
        await createTodo(title);
        todoInput.value = ""; // Input'u temizle
        await loadTodos(); // Listeyi yenile
      } catch (error) {
        // Hata zaten alert ile gösterildi
      }
    });
  }
