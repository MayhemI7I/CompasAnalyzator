package main

import (
	"embed"

	"compass_analyzer/desktop"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed webui/static/*
var assets embed.FS

func main() {
	// Создаем экземпляр приложения
	app := desktop.NewApp()

	// Настройки Wails
	err := wails.Run(&options.App{
		Title:     "Compass Analyzer - Анализатор калибровки компасов МТЦ",
		Width:     1400,
		Height:    900,
		MinWidth:  1200,
		MinHeight: 700,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 26, G: 29, B: 38, A: 255},
		OnStartup:        app.Startup,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    false,
		},
	})

	if err != nil {
		println("Ошибка:", err.Error())
	}
}
