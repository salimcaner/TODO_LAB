# ToDo Project - FastAPI + Supabase

Bu proje, FastAPI backend ve Supabase kullanarak geliştirilmiş bir ToDo uygulamasıdır.

## 🚀 Kurulum

### Gereksinimler

- Python 3.12 veya üzeri
- Supabase hesabı ve projesi

### Adım 1: Projeyi İndirin

```bash
git clone <repository-url>
cd ToDo_Project
```

### Adım 2: Virtual Environment Oluşturun

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Adım 3: Bağımlılıkları Yükleyin

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Adım 4: Environment Variables Ayarlayın

Proje root dizininde `.env` dosyası oluşturun:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
```

**Not:** `SUPABASE_KEY` için Supabase Dashboard > Settings > API > `anon` `public` key'ini kullanın.

### Adım 5: Supabase Veritabanını Hazırlayın

Supabase Dashboard > SQL Editor'de aşağıdaki SQL'i çalıştırın:

```sql
-- Todos tablosu oluştur
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) etkinleştir
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- RLS Politikaları
-- Kullanıcılar sadece kendi todo'larını görebilir
CREATE POLICY "Users can view own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi todo'larını ekleyebilir
CREATE POLICY "Users can insert own todos"
  ON todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar sadece kendi todo'larını güncelleyebilir
CREATE POLICY "Users can update own todos"
  ON todos FOR UPDATE
  USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi todo'larını silebilir
CREATE POLICY "Users can delete own todos"
  ON todos FOR DELETE
  USING (auth.uid() = user_id);
```

### Adım 6: Backend'i Başlatın

```bash
cd backends/login
python main.py
```

Backend `http://127.0.0.1:8000` adresinde çalışacaktır.

## 📁 Proje Yapısı

```
ToDo_Project/
├── backends/
│   └── login/
│       └── main.py          # FastAPI backend
├── frontend/
│   ├── login/               # Giriş sayfaları
│   └── home/                # Ana sayfa
├── requirements.txt         # Python bağımlılıkları
├── .env                     # Environment variables (oluşturulmalı)
└── README.md               # Bu dosya
```

## 🔧 Kullanılan Teknolojiler

- **Backend:** FastAPI 0.119.0
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Frontend:** Vanilla JavaScript, HTML, CSS

## 📝 API Endpoints

- `POST /signup` - Kullanıcı kaydı
- `POST /login` - Kullanıcı girişi
- `POST /forgot-password` - Şifre sıfırlama
- `GET /me` - Kullanıcı profili (Auth gerekli)
- `GET /todos` - Todo listesi (Auth gerekli)
- `POST /todos` - Yeni todo ekle (Auth gerekli)
- `PUT /todos/{id}` - Todo güncelle (Auth gerekli)
- `PATCH /todos/{id}` - Todo durumu değiştir (Auth gerekli)
- `DELETE /todos/{id}` - Todo sil (Auth gerekli)

## ⚠️ Önemli Notlar

1. `.env` dosyasını **asla** Git'e commit etmeyin
2. Production'da CORS ayarlarını güvenli hale getirin
3. Supabase'de email confirmation'ı test için kapatabilirsiniz
4. Production'da HTTPS kullanın

## 🐛 Sorun Giderme

### "Supabase bağlantısı yok" hatası
- `.env` dosyasının proje root dizininde olduğundan emin olun
- `SUPABASE_URL` ve `SUPABASE_KEY` değerlerini kontrol edin

### "Todos tablosu bulunamadı" hatası
- Supabase SQL Editor'de tablo oluşturma SQL'ini çalıştırdığınızdan emin olun

### "RLS policy" hatası
- Row Level Security politikalarını oluşturduğunuzdan emin olun

## 📄 Lisans

Bu proje eğitim amaçlıdır.

