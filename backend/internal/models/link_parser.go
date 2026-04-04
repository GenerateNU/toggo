package models

// LinkType identifies the source of a parsed link.
type LinkType string

const (
	LinkTypeAirbnb     LinkType = "airbnb"
	LinkTypeBookingCom LinkType = "booking_com"
	LinkTypeTikTok     LinkType = "tiktok"
	LinkTypeInstagram  LinkType = "instagram"
	LinkTypeGeneric    LinkType = "generic"
)

// ParseLinkRequest is the body for the parse-link endpoint.
type ParseLinkRequest struct {
	URL string `validate:"required,url" json:"url"`
}

// ParsedActivityData contains the pre-filled activity fields extracted from a URL.
// The client uses this to autofill the activity creation form.
type ParsedActivityData struct {
	Name                string   `json:"name"`
	Description         *string  `json:"description,omitempty"`
	ThumbnailURL        *string  `json:"thumbnail_url,omitempty"`
	MediaURL            *string  `json:"media_url,omitempty"`
	SourceURL           string   `json:"source_url"`
	SourceType          LinkType `json:"source_type"`
	CategorySuggestions []string `json:"category_suggestions"`
}
