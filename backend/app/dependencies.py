from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
from .config import settings

security = HTTPBearer()

jwks_client = PyJWKClient(settings.CLERK_JWKS_URL)

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"]
        )

        return data["sub"]

    except jwt.exceptions.PyJWTError as e:
        raise HTTPException(status_code=401, detail="Invalid Authentication Token")