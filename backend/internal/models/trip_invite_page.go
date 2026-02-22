package models

// TripInvitePageData contains data rendered by the invite landing page.
type TripInvitePageData struct {
	TripName         string
	InviteCode       string
	DeepLink         string
	CanonicalURL     string
	CoverImageURL    *string
	InviterName      string
	FirstMemberName  string
	OtherMemberCount int
	MemberCount      int
	LocationName     string
	DateRange        string
	ErrorMessage     string
}
