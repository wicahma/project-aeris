package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"project-aeris/backend/domain"
)

type AuthClaims struct {
	UserID   string      `json:"user_id"`
	Username string      `json:"username"`
	Role     domain.Role `json:"role"`
	jwt.RegisteredClaims
}

type authUseCase struct {
	userRepo  domain.AuthRepository
	jwtSecret []byte
}

func NewAuthUseCase(userRepo domain.AuthRepository, jwtSecret string) domain.AuthUseCase {
	if jwtSecret == "" {
		jwtSecret = "aeris-default-secret-key-change-in-prod"
	}
	return &authUseCase{
		userRepo:  userRepo,
		jwtSecret: []byte(jwtSecret),
	}
}

func (a *authUseCase) Register(ctx context.Context, username, password string, role domain.Role) (*domain.User, error) {
	if username == "" || password == "" {
		return nil, errors.New("username and password are required")
	}

	existing, _ := a.userRepo.GetUserByUsername(ctx, username)
	if existing != nil {
		return nil, errors.New("username already taken")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	if role == "" {
		role = domain.RoleEditor
	}

	user := &domain.User{
		ID:           fmt.Sprintf("usr_%d", time.Now().UnixNano()),
		Username:     username,
		PasswordHash: string(hashed),
		Role:         role,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := a.userRepo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (a *authUseCase) Login(ctx context.Context, username, password string) (string, *domain.User, error) {
	user, err := a.userRepo.GetUserByUsername(ctx, username)
	if err != nil {
		return "", nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", nil, errors.New("invalid credentials")
	}

	claims := &AuthClaims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(a.jwtSecret)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return tokenStr, user, nil
}

func (a *authUseCase) ValidateToken(tokenString string) (*domain.User, error) {
	token, err := jwt.ParseWithClaims(tokenString, &AuthClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return a.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}

	claims, ok := token.Claims.(*AuthClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	return &domain.User{
		ID:       claims.UserID,
		Username: claims.Username,
		Role:     claims.Role,
	}, nil
}

func (a *authUseCase) GetProfile(ctx context.Context, userID string) (*domain.User, error) {
	return a.userRepo.GetUserByID(ctx, userID)
}
