const container = document.querySelector('.container');
const forgotpasswordForm = document.querySelector('#forgotpasswordForm'); // HTML'deki ID ile eşleştiğinden emin olun
const forgotEmailInput = document.querySelector('#forgotEmail');
const sendLinkButton = document.querySelector('.btn');
const confirmationMessage = document.querySelector('#confirmationMessage');

// Backend API adresi
const API_BASE_URL = 'http://127.0.0.1:8000';

// Şifre Sıfırlama İsteği Gönderme
sendLinkButton.addEventListener('click', async(e) => {
    e.preventDefault(); // Formun normal gönderimini engelle

    // !!! YENİ LOGLAMA 1: Butona tıklandı mı? !!!
    console.log("Şifre sıfırlama butonu tıklandı.");

    const email = forgotEmailInput.value;

    //e-posta kontrolü
    if(!email){
        // !!! YENİ LOGLAMA 2: E-posta boş mu? !!!
        console.log("E-posta alanı boş.");
        alert("Lütfen e-posta adresinizi giriniz.");
        return;
    }

    // !!! YENİ LOGLAMA 3: Fetch öncesi e-posta değeri ve URL !!!
    console.log(`Fetch isteği gönderiliyor. URL: ${API_BASE_URL}/forgot-password, E-posta: ${email}`);

    //API'ye şifre sıfırlama isteği gönder
    try{
        const response = await fetch(`${API_BASE_URL}/forgot-password`,{
            method: 'POST',
            headers:{
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({email}),
        });

        // !!! YENİ LOGLAMA 4: Fetch yanıtı alındı !!!
        console.log("Fetch yanıtı alındı. Yanıt durumu:", response.status, response.statusText);

        const data = await response.json();

        if(!response.ok){
            // !!! YENİ LOGLAMA 5: Fetch yanıtı OK değil! !!!
            console.error("Fetch yanıtı OK değil. Hata detayı:", data.detail);
            throw new Error(data.detail || "Şifre sıfırlama isteği sırasında bilinmeyen bir hata oluştu.");
        }

        // !!! YENİ LOGLAMA 6: İstek başarılı !!!
        console.log("Şifre sıfırlama e-postası başarıyla gönderildi (backend'den gelen yanıt):", data);

        // Başarı durumunda formu gizle ve mesajı göster
        document.querySelector('.forgotpass').style.display = 'none';
        confirmationMessage.style.display ='block';

    }catch(error){
        // !!! YENİ LOGLAMA 7: Hata yakalandı !!!
        console.error("Şifre sıfırlama hatası yakalandı:", error);
        alert(`Şifre sıfırlama isteği sırasında bir hata oluştu: ${error.message}`)
    }
});