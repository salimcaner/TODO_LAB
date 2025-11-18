# main.py
import os
import json
import requests

import firebase_admin
from firebase_admin import credentials, auth, firestore

from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel


# Firebase Web API Key
FIREBASE_WEB_API_KEY = os.getenv(
    "FIREBASE_WEB_API_KEY",
    "AIzaSyArVmmEeBYNl55gDMno29_RbML03AmSqB0"
)

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

# Firebase Admin SDK + Firestore
SERVICE_ACCOUNT_FILE = os.path.join(
    os.path.dirname(__file__),
    "fastapi-auth-project-411d4-firebase-adminsdk-fbsvc-f6714f210e.json",
)

try:
    cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
    firebase_admin.initialize_app(cred)
    db = firestore.client()  # 🔥 initialize_app'ten SONRA
    print("Firebase Admin SDK ve Firestore başarıyla başlatıldı.")
except Exception as e:
    print(f"HATA: Firebase Admin SDK başlatılamadı! -> {e}")
    db = None  # önlem

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


# Auth helper (Bearer token doğrulama)
token_auth_scheme = HTTPBearer()


def get_current_user(cred_header: HTTPAuthorizationCredentials = Depends(token_auth_scheme)):
    if not cred_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token bulunamadı",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        token = cred_header.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Geçersiz token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Basit test endpoint'i
@app.get("/")
def read_root():
    return {"message": "Merhaba! FastAPI ve Firebase sunucunuz çalışıyor."}


# SIGNUP
@app.post("/signup", status_code=status.HTTP_201_CREATED)
def create_user(user: UserSchema):
    try:
        new_user = auth.create_user(
            email=user.email,
            password=user.password,
        )
        return {"message": "Kullanıcı başarıyla oluşturuldu", "uid": new_user.uid}

    except auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu email adresi zaten kullanılıyor",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"HATA: Sunucu Hatası: {str(e)}",
        )


# LOGIN
@app.post("/login", response_model=LoginResponseSchema)
def login_user(user: UserSchema):
    rest_api_url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"

    payload = json.dumps(
        {
            "email": user.email,
            "password": user.password,
            "returnSecureToken": True,
        }
    )

    params = {"key": FIREBASE_WEB_API_KEY}

    try:
        response = requests.post(rest_api_url, params=params, data=payload)
        response.raise_for_status()

        result = response.json()
        id_token = result.get("idToken")

        if not id_token:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Firebase'den idToken alınamadı.",
            )

        return LoginResponseSchema(idToken=id_token)

    except requests.exceptions.RequestException as e:
        try:
            error_data = e.response.json()
            error_message = error_data.get("error", {}).get(
                "message", "Bilinmeyen Firebase hatası"
            )
            print(f"Firebase Auth Hatası: {error_message}")

            if (
                "INVALID_PASSWORD" in error_message
                or "EMAIL_NOT_FOUND" in error_message
                or "INVALID_LOGIN_CREDENTIALS" in error_message
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="E-posta veya şifre hatalı.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Giriş hatası: {error_message}",
                )
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"API isteği sırasında hata: {str(e)}",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Beklenmedik bir sunucu hatası oluştu: {str(e)}",
        )


# FORGOT PASSWORD
@app.post("/forgot-password")
def forgot_password(forgot_data: ForgotPasswordSchema):
    rest_api_url = "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode"

    payload = json.dumps(
        {"requestType": "PASSWORD_RESET", "email": forgot_data.email}
    )

    params = {"key": FIREBASE_WEB_API_KEY}

    try:
        response = requests.post(rest_api_url, params=params, data=payload)
        response.raise_for_status()

        return {
            "message": "Şifre sıfırlama e-postası başarıyla gönderildi.",
            "email": forgot_data.email,
        }

    except requests.exceptions.RequestException as e:
        try:
            error_data = e.response.json()
            error_message = error_data.get("error", {}).get(
                "message", "Bilinmeyen Firebase hatası"
            )
            print(f"Firebase Forgot Password Hatası: {error_message}")

            if "EMAIL_NOT_FOUND" in error_message:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Bu e-posta adresi sistemde kayıtlı değil.",
                )
            elif "INVALID_EMAIL" in error_message:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Geçersiz e-posta adresi.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Şifre sıfırlama hatası: {error_message}",
                )
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"API isteği sırasında hata: {str(e)}",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Beklenmedik bir sunucu hatası oluştu: {str(e)}",
        )


# /me
@app.get("/me")
def get_user_profile(user_data: dict = Depends(get_current_user)):
    uid = user_data.get("uid")
    email = user_data.get("email")
    return {
        "message": f"Bu korumalı bir alandır. Hoş geldin {email}!",
        "uid": uid,
        "email": email,
    }


# TODOS
@app.post("/todos")
def create_todo(todo: TodoSchema, user_data: dict = Depends(get_current_user)):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore başlatılamadı")

    uid = user_data.get("uid")

    todo_ref = db.collection("todos").document()
    todo_ref.set(
        {
            "id": todo_ref.id,
            "title": todo.title,
            "completed": todo.completed,
            "userId": uid,
        }
    )

    return {"message": "Todo eklendi", "id": todo_ref.id}


@app.get("/todos")
def get_todos(user_data: dict = Depends(get_current_user)):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore başlatılamadı")

    uid = user_data.get("uid")

    docs = db.collection("todos").where("userId", "==", uid).stream()
    todos = [doc.to_dict() for doc in docs]

    return todos


@app.put("/todos/{todo_id}")
def update_todo(todo_id: str, todo: TodoSchema, user_data: dict = Depends(get_current_user)):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore başlatılamadı")

    uid = user_data.get("uid")

    todo_ref = db.collection("todos").document(todo_id)
    todo_doc = todo_ref.get()

    if not todo_doc.exists:
        raise HTTPException(status_code=404, detail="Todo bulunamadı")

    if todo_doc.to_dict().get("userId") != uid:
        raise HTTPException(status_code=403, detail="Bu todo sana ait değil")

    todo_ref.update(
        {
            "title": todo.title,
            "completed": todo.completed,
        }
    )

    return {"message": "Todo güncellendi", "id": todo_id}


@app.patch("/todos/{todo_id}")
def toggle_todo(todo_id: str, user_data: dict = Depends(get_current_user)):
    """Sadece completed durumunu değiştirir"""
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore başlatılamadı")

    uid = user_data.get("uid")

    todo_ref = db.collection("todos").document(todo_id)
    todo_doc = todo_ref.get()

    if not todo_doc.exists:
        raise HTTPException(status_code=404, detail="Todo bulunamadı")

    todo_data = todo_doc.to_dict()
    if todo_data.get("userId") != uid:
        raise HTTPException(status_code=403, detail="Bu todo sana ait değil")

    # Toggle completed durumu
    new_completed = not todo_data.get("completed", False)
    todo_ref.update({"completed": new_completed})

    return {"message": "Todo durumu güncellendi", "id": todo_id, "completed": new_completed}


@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: str, user_data: dict = Depends(get_current_user)):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore başlatılamadı")

    uid = user_data.get("uid")

    todo_ref = db.collection("todos").document(todo_id)
    todo_doc = todo_ref.get()

    if not todo_doc.exists:
        raise HTTPException(status_code=404, detail="Todo bulunamadı")

    if todo_doc.to_dict().get("userId") != uid:
        raise HTTPException(status_code=403, detail="Bu todo sana ait değil")

    todo_ref.delete()

    return {"message": "Todo silindi"}


# Uvicorn
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
