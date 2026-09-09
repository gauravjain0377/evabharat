package seed

import (
	"log"

	"github.com/gauravjain0377/evabharat/internal/model"
	"github.com/gauravjain0377/evabharat/internal/repository"
)

// DefaultWindows defines the initial display windows.
var DefaultWindows = []string{
	"Window A",
	"Window B",
	"Window C",
}

type seedMedia struct {
	Name     string
	Type     model.MediaType
	URL      string
	Duration int // seconds
}

// seed media items — mix of images, videos and a blank placeholder
var mediaItems = []seedMedia{
	{Name: "Nature Landscape", Type: model.MediaTypeImage, URL: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280", Duration: 10},
	{Name: "City Skyline",     Type: model.MediaTypeImage, URL: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1280", Duration: 10},
	{Name: "Forest Path",      Type: model.MediaTypeImage, URL: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1280", Duration: 10},
	{Name: "Ocean Waves",      Type: model.MediaTypeImage, URL: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1280", Duration: 10},
	{Name: "Mountain Peak",    Type: model.MediaTypeImage, URL: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1280", Duration: 10},
	{Name: "Desert Dunes",     Type: model.MediaTypeImage, URL: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1280", Duration: 10},
	{Name: "Sample Video",     Type: model.MediaTypeVideo, URL: "https://www.w3schools.com/html/mov_bbb.mp4", Duration: 30},
	{Name: "Blank Slide",      Type: model.MediaTypeBlank, URL: "", Duration: 5},
}

// Window A playlist positions (0-indexed into mediaItems)
var windowAPlaylist = []int{0, 1, 6, 2} // Nature, City, Video, Forest
// Window B playlist positions
var windowBPlaylist = []int{3, 4, 7, 5} // Ocean, Mountain, Blank, Desert
// Window C playlist positions
var windowCPlaylist = []int{0, 3, 6, 4, 1} // Nature, Ocean, Video, Mountain, City

// Run inserts seed data only when the database is empty.
func Run(winRepo *repository.WindowRepo, mediaRepo *repository.MediaRepo) error {
	windows, err := winRepo.List()
	if err != nil {
		return err
	}
	if len(windows) > 0 {
		log.Println("seed: database already has data, skipping")
		return nil
	}

	log.Println("seed: inserting initial data")

	// Create media items and track their IDs in order
	createdMedia := make([]string, len(mediaItems))
	for i, m := range mediaItems {
		item, err := mediaRepo.CreateMediaItem(m.Name, m.Type, m.URL, m.Duration)
		if err != nil {
			return err
		}
		createdMedia[i] = item.ID
	}

	// Create windows and assign playlists
	playlists := [][]int{windowAPlaylist, windowBPlaylist, windowCPlaylist}
	for i, name := range DefaultWindows {
		win, err := winRepo.Create(name)
		if err != nil {
			return err
		}
		for _, mediaIdx := range playlists[i] {
			if _, err := mediaRepo.AddToPlaylist(win.ID, createdMedia[mediaIdx]); err != nil {
				return err
			}
		}
		log.Printf("seed: created %s with %d items\n", win.Name, len(playlists[i]))
	}

	return nil
}
