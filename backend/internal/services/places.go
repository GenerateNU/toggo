package services

import (
	"context"
	"fmt"
	"toggo/internal/models"

	"googlemaps.github.io/maps"
)

// PlacesServiceInterface defines the contract for places-related operations
type PlacesServiceInterface interface {
	// SearchPlaces performs autocomplete search for places
	SearchPlaces(ctx context.Context, req models.PlacesSearchRequest) (*models.PlacesSearchResponse, error)

	// GetPlaceDetails retrieves detailed information about a specific place
	GetPlaceDetails(ctx context.Context, req models.PlaceDetailsRequest) (*models.PlaceDetailsResponse, error)
}

var _ PlacesServiceInterface = (*PlacesService)(nil)

// PlacesService handles interactions with Google Maps Places API
type PlacesService struct {
	client *maps.Client
	apiKey string
}

// NewPlacesService creates a new instance of PlacesService
func NewPlacesService(client *maps.Client, apiKey string) PlacesServiceInterface {
	return &PlacesService{
		client: client,
		apiKey: apiKey,
	}
}

// SearchPlaces performs autocomplete search for places
func (s *PlacesService) SearchPlaces(ctx context.Context, req models.PlacesSearchRequest) (*models.PlacesSearchResponse, error) {
	if req.Input == "" {
		return nil, fmt.Errorf("input is required")
	}

	// Set defaults
	if req.Limit == 0 {
		req.Limit = 5
	}
	if req.Limit > 20 {
		req.Limit = 20
	}

	// Build the autocomplete request
	r := &maps.PlaceAutocompleteRequest{
		Input: req.Input,
	}

	// Add optional parameters
	if req.Language != "" {
		r.Language = req.Language
	}

	if req.Types != "" {
		r.Types = maps.AutocompletePlaceType(req.Types)
	}

	// Make the API call
	response, err := s.client.PlaceAutocomplete(ctx, r)
	if err != nil {
		return nil, fmt.Errorf("failed to search places: %w", err)
	}

	// Transform the response to our model
	predictions := make([]models.PlacePrediction, 0, len(response.Predictions))
	for i, pred := range response.Predictions {
		if i >= req.Limit {
			break
		}

		// Extract matched substrings
		matchedSubstrings := make([]models.MatchedSubstring, 0, len(pred.MatchedSubstrings))
		for _, ms := range pred.MatchedSubstrings {
			matchedSubstrings = append(matchedSubstrings, models.MatchedSubstring{
				Length: ms.Length,
				Offset: ms.Offset,
			})
		}

		prediction := models.PlacePrediction{
			PlaceID:           pred.PlaceID,
			Description:       pred.Description,
			MainText:          pred.StructuredFormatting.MainText,
			SecondaryText:     pred.StructuredFormatting.SecondaryText,
			Types:             pred.Types,
			MatchedSubstrings: matchedSubstrings,
		}

		predictions = append(predictions, prediction)
	}

	return &models.PlacesSearchResponse{
		Predictions: predictions,
		Status:      "OK",
	}, nil
}

// GetPlaceDetails retrieves detailed information about a specific place
// Accepts either a PlaceID (from typeahead) or Input text (direct search)
func (s *PlacesService) GetPlaceDetails(ctx context.Context, req models.PlaceDetailsRequest) (*models.PlaceDetailsResponse, error) {
	// Validate that at least one identifier is provided
	if req.PlaceID == "" && req.Input == "" {
		return nil, fmt.Errorf("either place_id or input is required")
	}

	placeID := req.PlaceID

	if placeID == "" && req.Input != "" {
		searchReq := models.PlacesSearchRequest{
			Input:    req.Input,
			Limit:    1,
			Language: req.Language,
		}

		searchResp, err := s.SearchPlaces(ctx, searchReq)
		if err != nil {
			return nil, fmt.Errorf("failed to search for place: %w", err)
		}

		if len(searchResp.Predictions) == 0 {
			return nil, fmt.Errorf("no place found matching: %s", req.Input)
		}

		placeID = searchResp.Predictions[0].PlaceID
	}

	r := &maps.PlaceDetailsRequest{
		PlaceID: placeID,
	}

	if req.Language != "" {
		r.Language = req.Language
	}

	if len(req.Fields) > 0 {
		fields := make([]maps.PlaceDetailsFieldMask, 0, len(req.Fields))
		for _, field := range req.Fields {
			fields = append(fields, maps.PlaceDetailsFieldMask(field))
		}
		r.Fields = fields
	}

	response, err := s.client.PlaceDetails(ctx, r)
	if err != nil {
		return nil, fmt.Errorf("failed to get place details: %w", err)
	}

	addressComponents := make([]models.AddressComponent, 0, len(response.AddressComponents))
	for _, ac := range response.AddressComponents {
		addressComponents = append(addressComponents, models.AddressComponent{
			LongName:  ac.LongName,
			ShortName: ac.ShortName,
			Types:     ac.Types,
		})
	}

	photos := make([]models.PlacePhoto, 0, len(response.Photos))
	for _, photo := range response.Photos {
		photoURL := ""
		if photo.PhotoReference != "" {
			photoURL = fmt.Sprintf("https://maps.googleapis.com/maps/api/place/photo?maxwidth=%d&photo_reference=%s&key=%s",
				photo.Width, photo.PhotoReference, s.apiKey)
		}

		photos = append(photos, models.PlacePhoto{
			PhotoReference:   photo.PhotoReference,
			Height:           photo.Height,
			Width:            photo.Width,
			HTMLAttributions: photo.HTMLAttributions,
			PhotoURL:         photoURL,
		})
	}

	geometry := models.PlaceGeometry{
		Location: models.LatLng{
			Lat: response.Geometry.Location.Lat,
			Lng: response.Geometry.Location.Lng,
		},
	}

	geometry.Viewport = &models.Bounds{
		Northeast: models.LatLng{
			Lat: response.Geometry.Viewport.NorthEast.Lat,
			Lng: response.Geometry.Viewport.NorthEast.Lng,
		},
		Southwest: models.LatLng{
			Lat: response.Geometry.Viewport.SouthWest.Lat,
			Lng: response.Geometry.Viewport.SouthWest.Lng,
		},
	}

	var openingHours *models.OpeningHours
	if response.OpeningHours != nil {
		periods := make([]models.Period, 0, len(response.OpeningHours.Periods))
		for _, period := range response.OpeningHours.Periods {
			p := models.Period{
				Open: models.DayTime{
					Day:  int(period.Open.Day),
					Time: period.Open.Time,
				},
				Close: models.DayTime{
					Day:  int(period.Close.Day),
					Time: period.Close.Time,
				},
			}
			periods = append(periods, p)
		}

		openNow := false
		if response.OpeningHours.OpenNow != nil {
			openNow = *response.OpeningHours.OpenNow
		}
		openingHours = &models.OpeningHours{
			OpenNow:     openNow,
			Periods:     periods,
			WeekdayText: response.OpeningHours.WeekdayText,
		}
	}

	utcOffset := 0
	if response.UTCOffset != nil {
		utcOffset = *response.UTCOffset
	}

	details := &models.PlaceDetailsResponse{
		PlaceID:                  response.PlaceID,
		Name:                     response.Name,
		FormattedAddress:         response.FormattedAddress,
		AddressComponents:        addressComponents,
		Geometry:                 geometry,
		Types:                    response.Types,
		FormattedPhoneNumber:     response.FormattedPhoneNumber,
		InternationalPhoneNumber: response.InternationalPhoneNumber,
		Website:                  response.Website,
		Photos:                   photos,
		Rating:                   response.Rating,
		UserRatingsTotal:         response.UserRatingsTotal,
		OpeningHours:             openingHours,
		PriceLevel:               response.PriceLevel,
		UTCOffset:                utcOffset,
		Vicinity:                 response.Vicinity,
		Icon:                     response.Icon,
	}

	return details, nil
}
