package models

// SearchParams holds the validated query parameters for all search endpoints.
type SearchParams struct {
	Query  string `query:"q"      validate:"required,min=1,max=255"`
	Limit  *int   `query:"limit"  validate:"omitempty,gt=0,lte=100"`
	Offset int    `query:"offset" validate:"omitempty,gte=0"`
}

func (p *SearchParams) GetLimit() int {
	const defaultLimit = 20
	if p.Limit == nil {
		return defaultLimit
	}
	return *p.Limit
}

// SearchTripsResult is the paginated response for trip search.
type SearchTripsResult struct {
	Items  []*TripAPIResponse `json:"items"`
	Total  int                `json:"total"`
	Limit  int                `json:"limit"`
	Offset int                `json:"offset"`
}

// SearchActivitiesResult is the paginated response for activity search.
type SearchActivitiesResult struct {
	Items  []*ActivityAPIResponse `json:"items"`
	Total  int                    `json:"total"`
	Limit  int                    `json:"limit"`
	Offset int                    `json:"offset"`
}

// SearchMembersResult is the paginated response for trip-member search.
type SearchMembersResult struct {
	Items  []*MembershipAPIResponse `json:"items"`
	Total  int                      `json:"total"`
	Limit  int                      `json:"limit"`
	Offset int                      `json:"offset"`
}
