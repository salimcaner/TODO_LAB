
//BACKEND BAĞLANTI
  // LOGIN
  async function login(email, password) {
    const res = await fetch("http://127.0.0.1:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

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

      if (res.status === 401) {
          // Token geçersiz, login sayfasına yönlendir
          localStorage.removeItem("token");
          window.location.href = "../login/login.html";
          return [];
      }

      if (!res.ok) {
        throw new Error(error.detail || "Todo'lar yüklenemedi");
      }
      return await res.json();

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
        body: JSON.stringify({})
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
    const liste = document.querySelector(".gorevlistesi");
    liste.innerHTML = "";

    if (todos.length === 0) {
        liste.innerHTML = `<p style="color:#912f56; text-align:center;">Henüz görev yok.</p>`;
        return;
    }

    todos.forEach(todo => {
        const li = document.createElement("li");
        li.classList.add("gorev-item");
        if (todo.completed) li.classList.add("tamamlandi");

        li.innerHTML = `
            <input type="checkbox" class="gorev-checkbox" ${todo.completed ? "checked" : ""} data-id="${todo.id}">
            <label class="gorev-metni">${todo.title}</label>
            <button class="sil-btn" data-id="${todo.id}">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        liste.appendChild(li);
    });
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

/* ====================================
        EVENTLER (Sadece Backend)
==================================== */

// Görev ekleme
document.querySelector(".goreveklebtn").addEventListener("click", async () => {
    const input = document.querySelector(".gorevtext");
    const title = input.value.trim();

    if (!title) {
        alert("Lütfen görev girin!");
        return;
    }

    await createTodo(title);
    input.value = "";
    await loadTodos();
});

// Enter tuşu ile ekleme
document.querySelector(".gorevtext").addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
        document.querySelector(".goreveklebtn").click();
    }
});

// Görev listesi tıklamaları
document.querySelector(".gorevlistesi").addEventListener("click", async (e) => {

    // Silme
    if (e.target.closest(".sil-btn")) {
        const id = e.target.closest(".sil-btn").dataset.id;
        await deleteTodo(id);
        await loadTodos();
    }

    // Checkbox toggle
    if (e.target.classList.contains("gorev-checkbox")) {
        const id = e.target.dataset.id;
        await toggleTodo(id);
        await loadTodos();
    }
});

//AÇILIR MENÜ AYARI
document.addEventListener("DOMContentLoaded", function() {
    const toggleButton = document.querySelector(".toggle-btn");
    const body = document.body;


    toggleButton.addEventListener('click', function() {
        body.classList.toggle("sidebar-closed");
    });
});