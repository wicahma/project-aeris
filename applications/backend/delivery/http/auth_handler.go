package http

import (
	"encoding/json"
	"net/http"

	"project-aeris/backend/domain"
)

type AuthHandler struct {
	authUC domain.AuthUseCase
}

func NewAuthHandler(authUC domain.AuthUseCase) *AuthHandler {
	return &AuthHandler{authUC: authUC}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type registerRequest struct {
	Username string      `json:"username"`
	Password string      `json:"password"`
	Role     domain.Role `json:"role"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	token, user, err := h.authUC.Login(r.Context(), req.Username, req.Password)
	if err != nil {
		httpError(w, err.Error(), http.StatusUnauthorized)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	user, err := h.authUC.Register(r.Context(), req.Username, req.Password, req.Role)
	if err != nil {
		httpError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, http.StatusCreated, user)
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(UserContextKey).(*domain.User)
	if !ok || user == nil {
		httpError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fullUser, err := h.authUC.GetProfile(r.Context(), user.ID)
	if err != nil {
		jsonResponse(w, http.StatusOK, user)
		return
	}

	jsonResponse(w, http.StatusOK, fullUser)
}
