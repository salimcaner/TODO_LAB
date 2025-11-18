

//BACKEND BAĞLANTI
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


//AÇILIR MENÜ AYARI
document.addEventListener("DOMContentLoaded", function() {
    const toggleButton = document.querySelector(".toggle-btn");
    const body = document.body;


    toggleButton.addEventListener('click', function() {
        body.classList.toggle("sidebar-closed");
    });
});

console.log("menu açıldı");

//GÖREV EKLEME

document.addEventListener("DOMContentLoaded", function(){
    const gorevInput = document.querySelector(".gorevtext");
    const gorevEkleBtn = document.querySelector(".goreveklebtn");
    const gorevListesi = document.querySelector(".gorevlistesi");

    //görevler için benzersiz id oluşturma
    let gorevSayaci = 0;

    function yeniGorevEkle(){
        const gorevMetni = gorevInput.value.trim();

        if(gorevMetni === ""){
            alert("Lütfen Görev Giriniz!");
            console.log("geçersiz görev");
            return;
        }

        gorevSayaci++;
        const gorevID = "gorev-" + gorevSayaci;
        console.log(gorevID);

        const li = document.createElement("li");
        li.classList.add("gorev-item");

        li.innerHTML=`
            <input type="checkbox" class="gorev-checkbox" id="${gorevID}">
            <label for="${gorevID}" class="gorev-metni">${gorevMetni}</label>
            <button class="sil-btn"><i class="fa-solid fa-trash"></i></button>
        `;

        console.log("görev kutusu oluştu")

        gorevListesi.appendChild(li); //li yi ul a ekle

        gorevInput.value = ""; //Inputu temizle

    }

    gorevEkleBtn.addEventListener("click", function(event){
        event.preventDefault();
        yeniGorevEkle();
    });

    gorevInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Formun gönderilmesini engelle
            yeniGorevEkle();
        }
    });
     gorevListesi.addEventListener("click", function(event) {
        
        // Tıklanan eleman bir "sil-btn" sınıfına sahip mi?
        if (event.target.classList.contains("sil-btn")) {
            // Evetse, butonun ait olduğu <li> elementini bul ve sil
            const li = event.target.parentElement;
            li.remove();
        }

        if (event.target.classList.contains("gorev-checkbox")) {
            // Evetse, checkbox'ın ait olduğu <li> elementini bul
            const li = event.target.parentElement;
            // 'tamamlandi' sınıfını ekle veya kaldır
            li.classList.toggle("tamamlandi");
        }
    });
});
