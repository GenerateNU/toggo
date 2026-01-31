package models

type CursorPaginationParams struct {
	Limit  *int   `query:"limit" validate:"omitempty,gt=0,lte=100"`
	Cursor string `query:"cursor" validate:"omitempty"`
}

func (p *CursorPaginationParams) GetLimit() *int {
	if p.Limit == nil {
		defaultLimit := 20
		return &defaultLimit
	}
	return p.Limit
}

func (p *CursorPaginationParams) GetCursor() *string {
	if p.Cursor == "" {
		return nil
	}
	return &p.Cursor
}
