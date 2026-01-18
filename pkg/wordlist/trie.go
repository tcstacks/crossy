package wordlist

import "sort"

// TrieNode represents a node in the trie
type TrieNode struct {
	children map[rune]*TrieNode
	isEnd    bool
	score    int
	word     string
}

// Trie is a prefix tree data structure for efficient word lookups
type Trie struct {
	root *TrieNode
}

// NewTrie creates a new empty Trie
func NewTrie() *Trie {
	return &Trie{
		root: &TrieNode{
			children: make(map[rune]*TrieNode),
		},
	}
}

// Insert adds a word to the trie with its quality score
func (t *Trie) Insert(word string, score int) {
	if word == "" {
		return
	}

	node := t.root
	for _, ch := range word {
		if node.children == nil {
			node.children = make(map[rune]*TrieNode)
		}
		if _, exists := node.children[ch]; !exists {
			node.children[ch] = &TrieNode{
				children: make(map[rune]*TrieNode),
			}
		}
		node = node.children[ch]
	}
	node.isEnd = true
	node.score = score
	node.word = word
}

// MatchResult represents a word matching a pattern with its score
type MatchResult struct {
	Word  string
	Score int
}

// Match finds all words matching a pattern where '_' matches any single letter
// Results are sorted by score in descending order
func (t *Trie) Match(pattern string) []MatchResult {
	var results []MatchResult
	t.matchHelper(t.root, pattern, 0, &results)

	// Sort by score descending
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	return results
}

// matchHelper recursively searches for words matching the pattern
func (t *Trie) matchHelper(node *TrieNode, pattern string, pos int, results *[]MatchResult) {
	if node == nil {
		return
	}

	// If we've matched the entire pattern
	if pos == len(pattern) {
		if node.isEnd {
			*results = append(*results, MatchResult{
				Word:  node.word,
				Score: node.score,
			})
		}
		return
	}

	ch := rune(pattern[pos])

	// If current character is '_', try all possible children
	if ch == '_' {
		for _, child := range node.children {
			t.matchHelper(child, pattern, pos+1, results)
		}
	} else {
		// Try to match the specific character
		if child, exists := node.children[ch]; exists {
			t.matchHelper(child, pattern, pos+1, results)
		}
	}
}
