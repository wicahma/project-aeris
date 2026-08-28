package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"project-aeris/backend/domain"
)

type UserRepository struct {
	sysDB *SystemDB
}

func NewUserRepository(sysDB *SystemDB) *UserRepository {
	return &UserRepository{sysDB: sysDB}
}

func (r *UserRepository) CreateUser(ctx context.Context, user *domain.User) error {
	query := `INSERT INTO _system_users (id, username, password_hash, role, created_at, updated_at)
	          VALUES (?, ?, ?, ?, ?, ?);`
	_, err := r.sysDB.GetDB().ExecContext(ctx, query,
		user.ID,
		user.Username,
		user.PasswordHash,
		string(user.Role),
		user.CreatedAt,
		user.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func (r *UserRepository) GetUserByUsername(ctx context.Context, username string) (*domain.User, error) {
	query := `SELECT id, username, password_hash, role, created_at, updated_at
	          FROM _system_users WHERE username = ?;`
	row := r.sysDB.GetDB().QueryRowContext(ctx, query, username)

	var u domain.User
	var roleStr string
	var createdAt, updatedAt time.Time

	err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &roleStr, &createdAt, &updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	u.Role = domain.Role(roleStr)
	u.CreatedAt = createdAt
	u.UpdatedAt = updatedAt
	return &u, nil
}

func (r *UserRepository) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	query := `SELECT id, username, password_hash, role, created_at, updated_at
	          FROM _system_users WHERE id = ?;`
	row := r.sysDB.GetDB().QueryRowContext(ctx, query, id)

	var u domain.User
	var roleStr string
	var createdAt, updatedAt time.Time

	err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &roleStr, &createdAt, &updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	u.Role = domain.Role(roleStr)
	u.CreatedAt = createdAt
	u.UpdatedAt = updatedAt
	return &u, nil
}

func (r *UserRepository) ListUsers(ctx context.Context) ([]*domain.User, error) {
	query := `SELECT id, username, password_hash, role, created_at, updated_at FROM _system_users ORDER BY username;`
	rows, err := r.sysDB.GetDB().QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]*domain.User, 0)
	for rows.Next() {
		var u domain.User
		var roleStr string
		var createdAt, updatedAt time.Time

		if err := rows.Scan(&u.ID, &u.Username, &u.PasswordHash, &roleStr, &createdAt, &updatedAt); err != nil {
			return nil, err
		}

		u.Role = domain.Role(roleStr)
		u.CreatedAt = createdAt
		u.UpdatedAt = updatedAt
		users = append(users, &u)
	}

	return users, nil
}
