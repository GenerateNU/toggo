package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/server/middlewares"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func TripRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	tripService := services.NewTripService(
		routeParams.ServiceParams.Repository,
		routeParams.ServiceParams.FileService,
		routeParams.ServiceParams.EventPublisher,
	)
	tripController := controllers.NewTripController(tripService, routeParams.Validator)

	awsCfg := routeParams.ServiceParams.Config.AWS
	pitchService := services.NewPitchService(services.PitchServiceConfig{
		PresignClient:  awsCfg.PresignClient,
		PitchRepo:      routeParams.ServiceParams.Repository.Pitch,
		MembershipRepo: routeParams.ServiceParams.Repository.Membership,
		BucketName:     awsCfg.BucketName,
	})
	pitchController := controllers.NewPitchController(pitchService, routeParams.Validator)

	// /api/v1/trips
	tripGroup := apiGroup.Group("/trips")
	tripGroup.Post("", tripController.CreateTrip)
	tripGroup.Get("", tripController.GetAllTrips)

	// /api/v1/trips/:tripID
	tripIDGroup := tripGroup.Group("/:tripID")
	tripIDGroup.Use(middlewares.TripMemberRequired(routeParams.ServiceParams.Repository))
	tripIDGroup.Get("", tripController.GetTrip)
	tripIDGroup.Patch("", tripController.UpdateTrip)
	tripIDGroup.Delete("", tripController.DeleteTrip)
	tripIDGroup.Post("/invites", tripController.CreateTripInvite)

	// /api/v1/trips/:tripID/pitches
	tripIDGroup.Post("/pitches", pitchController.CreatePitch)
	tripIDGroup.Get("/pitches", pitchController.ListPitches)
	tripIDGroup.Get("/pitches/:pitchID", pitchController.GetPitch)
	tripIDGroup.Patch("/pitches/:pitchID", pitchController.UpdatePitch)
	tripIDGroup.Delete("/pitches/:pitchID", pitchController.DeletePitch)

	return tripGroup
}
