  // LOGIN
  async function login(email, password) {
    const res = await fetch("http://127.0.0.1:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    // Token buradan geliyor
    const token = data.idToken;

    // Token'ı sakla
    localStorage.setItem("token", token);

    console.log("Giriş başarılı, token:", token);
  }

  // TODO LİSTELEME
  async function getTodos() {
    const token = localStorage.getItem("token");

    const res = await fetch("http://127.0.0.1:8000/todos", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const todos = await res.json();
    console.log("Todos:", todos);
  }
