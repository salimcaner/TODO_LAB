from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import jwt

# .env dosyasını bul
base_dir = os.path.dirname(__file__)
project_root = os.path.join(base_dir, "..", "..")
env_path_root = os.path.abspath(os.path.join(project_root, ".env"))
env_path_local = os.path.abspath(os.path.join(base_dir, ".env"))

env_path = None
if os.path.exists(env_path_root):
    env_path = env_path_root
elif os.path.exists(env_path_local):
    env_path = env_path_local

# .env dosyasını yükle
if env_path:
    load_dotenv(env_path, override=True)
else:
    load_dotenv()

# Environment değişkenlerini al
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

try:
    if not SUPABASE_URL or not SUPABASE_KEY:
        supabase = None
    else:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception:
    supabase = None

# FastAPI App
app = FastAPI()

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Şemalar
class UserSchema(BaseModel):
    email: str
    password: str

class ForgotPasswordSchema(BaseModel):
    email: str

class LoginResponseSchema(BaseModel):
    idToken: str

class TodoSchema(BaseModel):
    title: str
    completed: bool = False


token_auth_scheme = HTTPBearer()


def get_current_user(cred: HTTPAuthorizationCredentials = Depends(token_auth_scheme)):
    """Bearer token'ı alır ve Supabase ile doğrular."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase bağlantısı yok")
        
    token = cred.credentials
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get("sub")
        email = decoded.get("email")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Token'da kullanıcı bilgisi bulunamadı")
        
        class User:
            def __init__(self, id, email):
                self.id = id
                self.email = email
        
        return User(user_id, email)
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Token decode edilemedi")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Oturum hatası: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "Merhaba! FastAPI ve Supabase sunucunuz çalışıyor."}


@app.post("/signup", status_code=status.HTTP_201_CREATED)
def create_user(user: UserSchema):
    if not supabase:
        error_msg = "Supabase bağlantısı kurulamadı. "
        if not SUPABASE_URL or not SUPABASE_KEY:
            error_msg += "Lütfen proje root dizininde .env dosyası oluşturup SUPABASE_URL ve SUPABASE_KEY değerlerini ekleyin. "
            error_msg += "Detaylar için terminal çıktısını kontrol edin."
        else:
            error_msg += "Supabase client oluşturulurken bir hata oluştu. Terminal çıktısını kontrol edin."
        raise HTTPException(status_code=500, detail=error_msg)
    
    try:
        res = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {
                "email_redirect_to": None
            }
        })
        
        if not res:
            raise HTTPException(status_code=500, detail="Supabase'den yanıt alınamadı")
        
        if not res.user:
            error_msg = "Kayıt başarısız"
            if hasattr(res, 'message'):
                error_msg = res.message
            elif hasattr(res, 'error'):
                error_msg = str(res.error)
            elif hasattr(res, 'error_description'):
                error_msg = res.error_description
            raise HTTPException(status_code=400, detail=error_msg)
        
        return {
            "message": "Kullanıcı başarıyla oluşturuldu. Lütfen giriş yapın.",
            "uid": res.user.id
        }
    except HTTPException:
        raise
    except Exception as e:
        error_detail = str(e)
        error_lower = error_detail.lower()
        if "already registered" in error_lower or "user already registered" in error_lower:
            raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanılıyor.")
        elif "invalid email" in error_lower or "email" in error_lower and "invalid" in error_lower:
            raise HTTPException(status_code=400, detail="Geçersiz e-posta adresi.")
        elif "password" in error_lower and ("weak" in error_lower or "short" in error_lower):
            raise HTTPException(status_code=400, detail="Şifre çok zayıf. En az 6 karakter olmalıdır.")
        elif "password" in error_lower:
            raise HTTPException(status_code=400, detail=f"Şifre hatası: {error_detail}")
        else:
            raise HTTPException(status_code=400, detail=f"Kayıt hatası: {error_detail}")
    
# LOGIN
@app.post("/login", response_model=LoginResponseSchema)
def login_user(user: UserSchema):
    if not supabase: 
        raise HTTPException(status_code=500, detail="Supabase bağlantısı yok")
    try:
        res = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        
        if not res:
            raise HTTPException(status_code=500, detail="Supabase'den yanıt alınamadı")
        
        if not res.session or not res.session.access_token:
            if res.user and not res.user.email_confirmed_at:
                raise HTTPException(
                    status_code=401, 
                    detail="E-posta adresiniz doğrulanmamış. Lütfen e-postanızı kontrol edin veya kayıt olurken e-posta doğrulamasını atlayın."
                )
            raise HTTPException(status_code=401, detail="Giriş başarısız. Lütfen e-posta ve şifrenizi kontrol edin.")
        
        return {"idToken": res.session.access_token}
    except HTTPException:
        raise
    except Exception as e:
        error_detail = str(e)
        error_lower = error_detail.lower()
        
        if "invalid login credentials" in error_lower or "invalid credentials" in error_lower:
            raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")
        elif "email not confirmed" in error_lower or "email not verified" in error_lower:
            raise HTTPException(status_code=401, detail="E-posta adresiniz doğrulanmamış. Lütfen e-postanızı kontrol edin.")
        elif "user not found" in error_lower:
            raise HTTPException(status_code=401, detail="Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.")
        else:
            raise HTTPException(status_code=401, detail=f"Giriş hatası: {error_detail}")

# FORGOT PASSWORD
@app.post("/forgot-password")
def forgot_password(forgot_data: ForgotPasswordSchema):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase bağlantısı yok")
    try:
        supabase.auth.reset_password_for_email(forgot_data.email)
        return {
            "message": "Şifre sıfırlama e-postası başarıyla gönderildi (Kullanıcının doğrulama yapması gerekir)."
        }
    except Exception:
        raise HTTPException(status_code=400, detail="Şifre sıfırlama isteği gönderilemedi.")

# /me
@app.get("/me")
def get_user_profile(user = Depends(get_current_user)):
    return {
        "message": f"Bu korumalı bir alandır. Hoş geldin {user.email}!",
        "uid": user.id,
        "email": user.email,
    }

@app.post("/todos")
def create_todo(todo: TodoSchema, user = Depends(get_current_user)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase bağlantısı yok")

    data = {
        "title": todo.title,
        "completed": todo.completed,
        "user_id": user.id 
    }
    
    try:
        res = supabase.table("todos").insert(data).execute()
        return {"message": "Todo eklendi", "id": res.data[0]['id']}
    except Exception as e:
        error_str = str(e)
        if "could not find the table" in error_str.lower() or "pgrst205" in error_str.lower():
            raise HTTPException(
                status_code=500, 
                detail="Todos tablosu bulunamadı. Lütfen Supabase Dashboard > SQL Editor'de supabase_todos_table.sql dosyasındaki SQL'i çalıştırın."
            )
        raise HTTPException(status_code=500, detail=f"Todo eklenemedi: {error_str}")

@app.get("/todos")
def get_todos(user = Depends(get_current_user)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase bağlantısı yok")

    try:
        res = supabase.table("todos").select("*").eq("user_id", user.id).execute()
        return res.data if res.data else []
    except Exception as e:
        error_str = str(e)
        
        if "could not find the table" in error_str.lower() or "pgrst205" in error_str.lower():
            raise HTTPException(
                status_code=500, 
                detail="Todos tablosu bulunamadı. Lütfen Supabase Dashboard > SQL Editor'de supabase_todos_table.sql dosyasındaki SQL'i çalıştırın."
            )
        
        if "permission denied" in error_str.lower() or "policy" in error_str.lower():
            raise HTTPException(
                status_code=500,
                detail="Row Level Security (RLS) politikası hatası. Lütfen Supabase Dashboard'da RLS politikalarını kontrol edin."
            )
        
        raise HTTPException(status_code=500, detail=f"Todo'lar listelenemedi: {error_str}")

@app.put("/todos/{todo_id}")
def update_todo(todo_id: str, todo: TodoSchema, user = Depends(get_current_user)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase bağlantısı yok")
    
    data = {
        "title": todo.title,
        "completed": todo.completed
    }

    try:
        res = supabase.table("todos").update(data).eq("id", todo_id).eq("user_id", user.id).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Todo bulunamadı veya size ait değil.")
        
        return {"message": "Todo güncellendi", "id": todo_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Todo güncellenemedi: {str(e)}")

@app.patch("/todos/{todo_id}")
def toggle_todo(todo_id: str, user = Depends(get_current_user)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase bağlantısı yok")
    
    try:
        current = supabase.table("todos").select("completed").eq("id", todo_id).eq("user_id", user.id).single().execute()
        new_completed = not current.data['completed']
        res = supabase.table("todos").update({"completed": new_completed}).eq("id", todo_id).eq("user_id", user.id).execute()

        if not res.data:
            raise HTTPException(status_code=404, detail="Todo bulunamadı veya size ait değil.")

        return {"message": "Todo durumu güncellendi", "id": todo_id, "completed": new_completed}
    except Exception as e:
        if "Postgrest API error" in str(e) and "rows returned" in str(e):
            raise HTTPException(status_code=404, detail="Todo bulunamadı veya size ait değil.")
        raise HTTPException(status_code=500, detail=f"Todo durumu güncellenemedi: {str(e)}")


@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: str, user = Depends(get_current_user)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase bağlantısı yok")
    
    try:
        res = supabase.table("todos").delete().eq("id", todo_id).eq("user_id", user.id).execute()
        
        return {"message": "Todo silindi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Todo silinemedi: {str(e)}")


# Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)