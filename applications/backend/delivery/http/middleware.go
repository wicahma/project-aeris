package http

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"project-aeris/backend/domain"
)

type contextKey string

const UserContextKey contextKey = "user"

func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func JWTAuthMiddleware(authUC domain.AuthUseCase) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				// Also check query param token for SSE / websocket
				authHeader = r.URL.Query().Get("token")
				if authHeader != "" {
					authHeader = "Bearer " + authHeader
				}
			}

			if authHeader == "" {
				httpError(w, "Authorization header required", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				httpError(w, "Invalid authorization header format", http.StatusUnauthorized)
				return
			}

			user, err := authUC.ValidateToken(parts[1])
			if err != nil {
				httpError(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserContextKey, user)
			ctx = context.WithValue(ctx, "username", user.Username)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RBACMiddleware(allowedRoles ...domain.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := r.Context().Value(UserContextKey).(*domain.User)
			if !ok || user == nil {
				httpError(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			permitted := false
			for _, role := range allowedRoles {
				if user.Role == role || user.Role == domain.RoleAdmin {
					permitted = true
					break
				}
			}

			if !permitted {
				httpError(w, "Forbidden: insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func httpError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"error": message,
		"code":  code,
	})
}

func jsonResponse(w http.ResponseWriter, code int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(data)
}
