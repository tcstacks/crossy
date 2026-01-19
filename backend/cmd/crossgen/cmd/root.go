package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

const version = "0.1.0"

var (
	cfgFile   string
	verbosity int
)

var rootCmd = &cobra.Command{
	Use:   "crossgen",
	Short: "Crossword puzzle generator CLI",
	Long: `crossgen is a command-line tool for generating, validating, and converting crossword puzzles.

It uses constraint satisfaction to fill grids with words from Peter Broda's wordlist
and generates clues using LLM providers (Anthropic Claude or Ollama).`,
	Version: version,
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	cobra.OnInitialize(initConfig)

	// Global flags
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.crossgen.yaml)")
	rootCmd.PersistentFlags().IntVarP(&verbosity, "verbosity", "v", 0, "verbosity level (0=errors only, 1=info, 2=debug)")
}

func initConfig() {
	if cfgFile != "" {
		// Use config file from the flag
		fmt.Fprintf(os.Stderr, "Using config file: %s\n", cfgFile)
	}

	// Set up verbosity level if needed
	if verbosity > 0 {
		fmt.Fprintf(os.Stderr, "Verbosity level: %d\n", verbosity)
	}
}
