package puzzle

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"
)

// WordListService provides word lookup and scoring for crossword construction
type WordListService struct {
	httpClient     *http.Client
	scoredWords    map[string]int      // word -> quality score (0-100)
	wordsByLength  map[int][]ScoredWord // length -> words sorted by score
	crosswordese   map[string]bool      // common crossword-only words to limit
	mu             sync.RWMutex
}

// ScoredWord represents a word with its quality score
type ScoredWord struct {
	Word  string `json:"word"`
	Score int    `json:"score"` // 0-100, higher is better
}

// DatamuseResult represents a response from the Datamuse API
type DatamuseResult struct {
	Word  string   `json:"word"`
	Score int      `json:"score"`
	Tags  []string `json:"tags,omitempty"`
	Defs  []string `json:"defs,omitempty"`
}

// NewWordListService creates a new word list service
func NewWordListService() *WordListService {
	wls := &WordListService{
		httpClient:    &http.Client{Timeout: 10 * time.Second},
		scoredWords:   make(map[string]int),
		wordsByLength: make(map[int][]ScoredWord),
		crosswordese:  make(map[string]bool),
	}
	wls.initializeCrosswordese()
	wls.initializeBaseWordList()
	return wls
}

// initializeCrosswordese sets up the list of overused crossword words
func (wls *WordListService) initializeCrosswordese() {
	// Common crosswordese - words that appear too often in crosswords
	// These should be limited but not completely banned
	crosswordeseWords := []string{
		"OREO", "ERIE", "ALOE", "EPEE", "ESNE", "ANOA", "UNAU",
		"ETUI", "OLEO", "OLIO", "OAST", "OGEE", "ALEE", "ASEA",
		"ARIA", "AREA", "EDEN", "EMIT", "EMIR", "ELAN", "ERNE",
		"OSSA", "OTIC", "OMIT", "ORAL", "EWER", "EASE", "EAVE",
		"APSE", "ALGA", "AGUE", "AGIO", "AGEE", "ANTE", "ANTI",
		"ATOP", "AIDE", "ACME", "ACRE", "EDNA", "ELBA", "ELMS",
		"EDDY", "EARL", "EASE", "EKED", "EKED", "ELHI", "ELEM",
		"EELS", "EBON", "EBBS", "ETAS", "ETCH", "ETNA", "EURO",
	}
	for _, word := range crosswordeseWords {
		wls.crosswordese[strings.ToUpper(word)] = true
	}
}

// initializeBaseWordList sets up a basic scored word list
func (wls *WordListService) initializeBaseWordList() {
	// High-quality common words (score 80-100)
	highQuality := []string{
		// 3-letter words
		"ACE", "ACT", "ADD", "AGE", "AID", "AIM", "AIR", "ALL", "AND", "ANT",
		"ANY", "APE", "ARC", "ARE", "ARK", "ARM", "ART", "ASK", "ATE", "AWE",
		"AXE", "BAD", "BAG", "BAR", "BAT", "BED", "BEE", "BET", "BIG", "BIT",
		"BOW", "BOX", "BOY", "BUD", "BUG", "BUS", "BUT", "BUY", "CAB", "CAN",
		"CAP", "CAR", "CAT", "COB", "COD", "COG", "COP", "COT", "COW", "CRY",
		"CUB", "CUD", "CUP", "CUT", "DAB", "DAD", "DAM", "DAY", "DEN", "DEW",
		"DID", "DIG", "DIM", "DIP", "DOC", "DOE", "DOG", "DOT", "DRY", "DUB",
		"DUD", "DUE", "DUG", "EAR", "EAT", "EEL", "EGG", "ELF", "ELK", "ELM",
		"EMU", "END", "ERA", "EVE", "EWE", "EYE", "FAN", "FAR", "FAT", "FAX",
		"FED", "FEE", "FEW", "FIG", "FIN", "FIR", "FIT", "FIX", "FLY", "FOB",
		// 4-letter words
		"ABLE", "ACHE", "ACID", "ACRE", "AGED", "ALSO", "AMID", "ANTI", "ARCH",
		"ARMY", "ATOM", "AUTO", "BABY", "BACK", "BAKE", "BALL", "BAND", "BANK",
		"BARK", "BARN", "BASE", "BATH", "BEAR", "BEAT", "BEEN", "BEER", "BELL",
		"BELT", "BEND", "BENT", "BEST", "BETA", "BIKE", "BILL", "BIND", "BIRD",
		"BITE", "BLOW", "BLUE", "BOAT", "BODY", "BOIL", "BOLD", "BOLT", "BOMB",
		"BOND", "BONE", "BOOK", "BOOM", "BOOT", "BORN", "BOSS", "BOTH", "BOWL",
		"BRAG", "BREW", "BUCK", "BULB", "BULK", "BULL", "BUMP", "BURN", "BURY",
		"BUSH", "BUSY", "CAFE", "CAGE", "CAKE", "CALF", "CALL", "CALM", "CAME",
		"CAMP", "CARD", "CARE", "CART", "CASE", "CASH", "CAST", "CAVE", "CELL",
		"CHEF", "CHEW", "CHIP", "CHOP", "CITY", "CLAM", "CLAP", "CLAW", "CLAY",
		// 5-letter words
		"ABOUT", "ABOVE", "ACTOR", "ADAPT", "ADMIT", "ADOPT", "ADULT", "AFTER",
		"AGAIN", "AGENT", "AGREE", "AHEAD", "ALARM", "ALBUM", "ALERT", "ALIEN",
		"ALIGN", "ALIKE", "ALIVE", "ALLEY", "ALLOW", "ALONE", "ALONG", "ALPHA",
		"ALTER", "AMONG", "ANGEL", "ANGER", "ANGLE", "ANGRY", "APART", "APPLE",
		"APPLY", "ARENA", "ARGUE", "ARISE", "ARMOR", "AROMA", "ARRAY", "ARROW",
		"ASIDE", "ASSET", "ATLAS", "AUDIO", "AUDIT", "AVOID", "AWAIT", "AWAKE",
		"AWARD", "AWARE", "BADLY", "BAKER", "BASIC", "BASIN", "BASIS", "BATCH",
		"BEACH", "BEARD", "BEAST", "BEGAN", "BEGIN", "BEING", "BELLY", "BELOW",
		"BENCH", "BERRY", "BIBLE", "BLACK", "BLADE", "BLAME", "BLANK", "BLAST",
		"BLAZE", "BLEED", "BLEND", "BLESS", "BLIND", "BLOCK", "BLOOD", "BLOOM",
		// 6-letter words
		"ABROAD", "ABSENT", "ABSORB", "ACCENT", "ACCEPT", "ACCESS", "ACCORD",
		"ACCUSE", "ACTION", "ACTIVE", "ACTUAL", "ADVICE", "ADVISE", "AFFAIR",
		"AFFECT", "AFFORD", "AFRAID", "AGENDA", "AGREED", "ALMOST", "ALWAYS",
		"AMOUNT", "ANIMAL", "ANNUAL", "ANSWER", "ANYONE", "APPEAL", "APPEAR",
		"ARTIST", "ASSUME", "ATTACK", "ATTEND", "AUTHOR", "AVENUE", "BACKED",
		"BACKUP", "BANNER", "BARREL", "BASKET", "BATTLE", "BEAUTY", "BECAME",
		"BECOME", "BEFORE", "BEHALF", "BEHIND", "BELIEF", "BELONG", "BESIDE",
		"BETTER", "BEYOND", "BISHOP", "BITTER", "BLANKET", "BLOCKS", "BORDER",
		// 7-letter words
		"ABANDON", "ABILITY", "ABSENCE", "ACCOUNT", "ACHIEVE", "ACQUIRE", "ADDRESS",
		"ADVANCE", "AGAINST", "ALCOHOL", "ALREADY", "ANCIENT", "ANOTHER", "ANXIETY",
		"ANYBODY", "ANYWAYS", "APPLIED", "APPROVE", "ARTICLE", "ASSAULT", "ATTEMPT",
		"ATTRACT", "AVERAGE", "BACKING", "BALANCE", "BANKING", "BARGAIN", "BARRIER",
		"BASEBALL", "BATTERY", "BEATING", "BECAUSE", "BEDROOM", "BELIEVE", "BENEFIT",
		"BESIDES", "BIGGEST", "BILLION", "BINDING", "BLANKET", "BLOCKED", "BOOKING",
	}

	// Medium-quality words (score 50-79)
	mediumQuality := []string{
		"AJAR", "AQUA", "AXLE", "BOAR", "CEDE", "CLOD", "CRUX", "DAIS", "DOLT",
		"EDGY", "FAWN", "GAWK", "GNAW", "HAZE", "IBEX", "JEER", "KEEL", "LAUD",
		"MELD", "NEWT", "OPUS", "PYRE", "QUAY", "RIFT", "SILO", "TUSK", "ULNA",
		"VANE", "WANE", "YAWL", "ZEAL", "ABODE", "AGILE", "BRAWL", "CRYPT",
		"DROLL", "ELFIN", "FJORD", "GLAZE", "HUSKY", "INFER", "JAUNT", "KNOLL",
		"LUCID", "MIRTH", "NEEDY", "OVERT", "PLUMB", "QUALM", "REIGN", "SCALD",
	}

	// Add high-quality words
	for _, word := range highQuality {
		w := strings.ToUpper(word)
		wls.scoredWords[w] = 85
		wls.addToLengthIndex(w, 85)
	}

	// Add medium-quality words
	for _, word := range mediumQuality {
		w := strings.ToUpper(word)
		wls.scoredWords[w] = 60
		wls.addToLengthIndex(w, 60)
	}

	// Sort word lists by score
	for length := range wls.wordsByLength {
		sort.Slice(wls.wordsByLength[length], func(i, j int) bool {
			return wls.wordsByLength[length][i].Score > wls.wordsByLength[length][j].Score
		})
	}
}

func (wls *WordListService) addToLengthIndex(word string, score int) {
	length := len(word)
	wls.wordsByLength[length] = append(wls.wordsByLength[length], ScoredWord{
		Word:  word,
		Score: score,
	})
}

// GetWordScore returns the quality score for a word (0-100)
func (wls *WordListService) GetWordScore(word string) int {
	wls.mu.RLock()
	defer wls.mu.RUnlock()

	w := strings.ToUpper(word)
	if score, ok := wls.scoredWords[w]; ok {
		return score
	}
	// Default score for unknown words
	return 40
}

// IsCrosswordese returns true if the word is overused in crosswords
func (wls *WordListService) IsCrosswordese(word string) bool {
	wls.mu.RLock()
	defer wls.mu.RUnlock()
	return wls.crosswordese[strings.ToUpper(word)]
}

// GetWordsForPattern finds words matching a pattern (e.g., "C?T" matches "CAT", "COT")
func (wls *WordListService) GetWordsForPattern(pattern string, minScore int) []ScoredWord {
	wls.mu.RLock()
	defer wls.mu.RUnlock()

	pattern = strings.ToUpper(pattern)
	length := len(pattern)

	var results []ScoredWord
	if words, ok := wls.wordsByLength[length]; ok {
		for _, sw := range words {
			if sw.Score < minScore {
				continue
			}
			if matchesPattern(sw.Word, pattern) {
				results = append(results, sw)
			}
		}
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	return results
}

// matchesPattern checks if a word matches a pattern with wildcards (?)
func matchesPattern(word, pattern string) bool {
	if len(word) != len(pattern) {
		return false
	}
	for i := 0; i < len(pattern); i++ {
		if pattern[i] != '?' && word[i] != pattern[i] {
			return false
		}
	}
	return true
}

// DatamuseFindWords uses the Datamuse API to find words
func (wls *WordListService) DatamuseFindWords(query DatamuseQuery) ([]DatamuseResult, error) {
	baseURL := "https://api.datamuse.com/words"
	params := url.Values{}

	if query.MeansLike != "" {
		params.Set("ml", query.MeansLike)
	}
	if query.SoundsLike != "" {
		params.Set("sl", query.SoundsLike)
	}
	if query.SpelledLike != "" {
		params.Set("sp", query.SpelledLike)
	}
	if query.RelatedTo != "" {
		params.Set("rel_trg", query.RelatedTo) // "triggered by" relation
	}
	if query.LeftContext != "" {
		params.Set("lc", query.LeftContext)
	}
	if query.RightContext != "" {
		params.Set("rc", query.RightContext)
	}
	if query.MaxResults > 0 {
		params.Set("max", fmt.Sprintf("%d", query.MaxResults))
	}
	if query.IncludeDefinitions {
		params.Set("md", "d") // include definitions
	}
	if query.IncludePartOfSpeech {
		params.Set("md", "p") // include part of speech
	}

	fullURL := baseURL + "?" + params.Encode()

	resp, err := wls.httpClient.Get(fullURL)
	if err != nil {
		return nil, fmt.Errorf("datamuse API error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("datamuse API returned %d: %s", resp.StatusCode, string(body))
	}

	var results []DatamuseResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return results, nil
}

// DatamuseQuery represents query parameters for Datamuse API
type DatamuseQuery struct {
	MeansLike           string // Words with similar meaning (ml=)
	SoundsLike          string // Words that sound similar (sl=)
	SpelledLike         string // Pattern matching with wildcards (sp=)
	RelatedTo           string // Semantically related words (rel_trg=)
	LeftContext         string // Words that follow this word (lc=)
	RightContext        string // Words that precede this word (rc=)
	MaxResults          int    // Maximum number of results
	IncludeDefinitions  bool   // Include word definitions
	IncludePartOfSpeech bool   // Include part of speech tags
}

// FindSynonyms finds synonyms for a word using Datamuse
func (wls *WordListService) FindSynonyms(word string, maxResults int) ([]string, error) {
	results, err := wls.DatamuseFindWords(DatamuseQuery{
		MeansLike:  word,
		MaxResults: maxResults,
	})
	if err != nil {
		return nil, err
	}

	synonyms := make([]string, 0, len(results))
	for _, r := range results {
		synonyms = append(synonyms, strings.ToUpper(r.Word))
	}
	return synonyms, nil
}

// FindWordsByPattern finds words matching a pattern (? = any letter)
func (wls *WordListService) FindWordsByPattern(pattern string, maxResults int) ([]string, error) {
	// Convert our pattern format to Datamuse format (? -> ?)
	datamusePattern := pattern

	results, err := wls.DatamuseFindWords(DatamuseQuery{
		SpelledLike: datamusePattern,
		MaxResults:  maxResults,
	})
	if err != nil {
		return nil, err
	}

	words := make([]string, 0, len(results))
	for _, r := range results {
		words = append(words, strings.ToUpper(r.Word))
	}
	return words, nil
}

// GetDefinition fetches the definition of a word
func (wls *WordListService) GetDefinition(word string) (string, error) {
	// Try Free Dictionary API first
	definition, err := wls.fetchFreeDictionaryDefinition(word)
	if err == nil && definition != "" {
		return definition, nil
	}

	// Fallback to Datamuse
	results, err := wls.DatamuseFindWords(DatamuseQuery{
		SpelledLike:        word,
		MaxResults:         1,
		IncludeDefinitions: true,
	})
	if err != nil {
		return "", err
	}

	if len(results) > 0 && len(results[0].Defs) > 0 {
		return results[0].Defs[0], nil
	}

	return "", fmt.Errorf("no definition found for %s", word)
}

// FreeDictionaryResponse represents a response from the Free Dictionary API
type FreeDictionaryResponse struct {
	Word      string `json:"word"`
	Phonetic  string `json:"phonetic"`
	Phonetics []struct {
		Text  string `json:"text"`
		Audio string `json:"audio"`
	} `json:"phonetics"`
	Meanings []struct {
		PartOfSpeech string `json:"partOfSpeech"`
		Definitions  []struct {
			Definition string   `json:"definition"`
			Synonyms   []string `json:"synonyms"`
			Antonyms   []string `json:"antonyms"`
			Example    string   `json:"example"`
		} `json:"definitions"`
	} `json:"meanings"`
}

func (wls *WordListService) fetchFreeDictionaryDefinition(word string) (string, error) {
	url := fmt.Sprintf("https://api.dictionaryapi.dev/api/v2/entries/en/%s", strings.ToLower(word))

	resp, err := wls.httpClient.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("dictionary API returned %d", resp.StatusCode)
	}

	var results []FreeDictionaryResponse
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return "", err
	}

	if len(results) > 0 && len(results[0].Meanings) > 0 && len(results[0].Meanings[0].Definitions) > 0 {
		return results[0].Meanings[0].Definitions[0].Definition, nil
	}

	return "", fmt.Errorf("no definition found")
}

// AddWord adds a word to the word list with a score
func (wls *WordListService) AddWord(word string, score int) {
	wls.mu.Lock()
	defer wls.mu.Unlock()

	w := strings.ToUpper(word)
	wls.scoredWords[w] = score
	wls.wordsByLength[len(w)] = append(wls.wordsByLength[len(w)], ScoredWord{
		Word:  w,
		Score: score,
	})
}

// LoadWordList loads a word list from a slice of scored words
func (wls *WordListService) LoadWordList(words []ScoredWord) {
	wls.mu.Lock()
	defer wls.mu.Unlock()

	for _, sw := range words {
		w := strings.ToUpper(sw.Word)
		wls.scoredWords[w] = sw.Score
		wls.wordsByLength[len(w)] = append(wls.wordsByLength[len(w)], ScoredWord{
			Word:  w,
			Score: sw.Score,
		})
	}

	// Sort by score
	for length := range wls.wordsByLength {
		sort.Slice(wls.wordsByLength[length], func(i, j int) bool {
			return wls.wordsByLength[length][i].Score > wls.wordsByLength[length][j].Score
		})
	}
}

// GetTopWords returns the top N words of a given length
func (wls *WordListService) GetTopWords(length, n int) []ScoredWord {
	wls.mu.RLock()
	defer wls.mu.RUnlock()

	if words, ok := wls.wordsByLength[length]; ok {
		if n > len(words) {
			n = len(words)
		}
		result := make([]ScoredWord, n)
		copy(result, words[:n])
		return result
	}
	return nil
}

// WordCount returns the total number of words in the list
func (wls *WordListService) WordCount() int {
	wls.mu.RLock()
	defer wls.mu.RUnlock()
	return len(wls.scoredWords)
}

// HasWord checks if a word exists in the word list
func (wls *WordListService) HasWord(word string) bool {
	wls.mu.RLock()
	defer wls.mu.RUnlock()
	_, ok := wls.scoredWords[strings.ToUpper(word)]
	return ok
}
