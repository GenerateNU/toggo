package models

import "html/template"

// TripInvitePageData contains data rendered by the invite landing page.
type TripInvitePageData struct {
	TripName         string
	InviteCode       string
	DeepLink         template.URL
	CanonicalURL     string
	CoverImageURL            *string
	InviterName              string
	InviterProfilePictureURL *string
	FirstMemberName          string
	OtherMemberCount         int
	MemberCount              int
	ErrorMessage             string
}
