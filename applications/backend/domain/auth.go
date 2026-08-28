package domain

import (
	"context"
	"time"
)

type Role string

const (
	RoleAdmin  Role = "admin"
	RoleEditor Role = "editor"
	RoleViewer Role = "viewer"
)

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Role         Role      `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type AuthRepository interface {
	CreateUser(ctx context.Context, user *User) error
	GetUserByUsername(ctx context.Context, username string) (*User, error)
	GetUserByID(ctx context.Context, id string) (*User, error)
	ListUsers(ctx context.Context) ([]*User, error)
}

type AuthUseCase interface {
	Register(ctx context.Context, username, password string, role Role) (*User, error)
	Login(ctx context.Context, username, password string) (token string, user *User, err error)
	ValidateToken(tokenString string) (*User, error)
	GetProfile(ctx context.Context, userID string) (*User, error)
}
