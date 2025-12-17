
//Eleman Seçimi
const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');
//Kayıt formu eleman seçimi
const registerForm = document.querySelector('#registerForm');
const registerEmail = document.querySelector('#registerEmail');
const registerPassword = document.querySelector('#registerPassword');
//Giriş Formu Elemen Seçimi
const loginForm = document.querySelector('#loginForm');
const loginEmail = document.querySelector('#loginEmail');
const loginPassword = document.querySelector('#loginPassword');

//Backend API adresi
const API_BASE_URL = 'http://127.0.0.1:8000';

registerBtn.addEventListener('click', ()=>{
    container.classList.add('active');
});

loginBtn.addEventListener('click', () =>{
    container.classList.remove('active');
});

//kayıt Formu Gönderildiğinde Çalışacak Fonksiyon
registerForm.addEventListener('submit', async (e) =>{
    e.preventDefault(); //Default değer gönderimini engelle

    const email = registerEmail.value;
    const password = registerPassword.value;

    try{
        // Backend API'ye kayıt isteği gönder
        const response = await fetch(`${API_BASE_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Kayıt başarılı
            console.log("Kayıt başarılı! Kullanıcı UID:", data.uid);
            alert("Kayıt başarıyla tamamlandı! Giriş yapabilirsiniz.");
            
            // Temizleme
            registerEmail.value = '';
            registerPassword.value = '';
            container.classList.remove('active'); // Giriş formunu göster
        } else {
            // Backend'den gelen hata mesajını göster
            throw new Error(data.detail || 'Kayıt sırasında bir hata oluştu');
        }

    } catch (error) {
        console.error("Kayıt Hatası: ", error);
        alert(`Kayıt sırasında bir hata oluştu: ${error.message}`);
    }
});

// Giriş formu gönderildiğinde çalışacak fonksiyon
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Formun varsayılan gönderme işlemini engelle

    const email = loginEmail.value;
    const password = loginPassword.value;

    try {
        // Backend API'ye giriş isteği gönder
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Giriş başarılı
            console.log("Giriş başarılı! ID Token:", data.idToken);
            
            // Token'ı localStorage'a kaydet
            localStorage.setItem('token', data.idToken);

            alert("Giriş başarıyla yapıldı!");
            loginEmail.value = ''; // Inputları temizle
            loginPassword.value = '';

            // Kullanıcıyı ana sayfaya yönlendir
            window.location.href = '../home/home.html';
        } else {
            // Backend'den gelen hata mesajını göster
            throw new Error(data.detail || 'Giriş sırasında bir hata oluştu');
        }

    } catch (error) {
        console.error("Giriş hatası:", error);
        alert(`Giriş sırasında bir hata oluştu: ${error.message}`);
    }
});



