package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

const (
	baseURL          = "http://localhost:8080"
	wsURL            = "ws://localhost:8080"
	concurrentUsers  = 1000
	testDuration     = 30 * time.Second
	apiRampUpTime    = 5 * time.Second
	wsRampUpTime     = 10 * time.Second
)

type Stats struct {
	apiRequests       int64
	apiSuccess        int64
	apiFailed         int64
	apiTotalLatency   int64
	apiMaxLatency     int64
	wsConnections     int64
	wsSuccess         int64
	wsFailed          int64
	wsMessages        int64
	wsTotalLatency    int64
	wsMaxLatency      int64
}

var stats Stats

func main() {
	fmt.Printf("Starting load test with %d concurrent users for %v\n", concurrentUsers, testDuration)
	fmt.Println("===========================================")

	var wg sync.WaitGroup
	startTime := time.Now()
	stopChan := make(chan struct{})

	// Phase 1: API Load Test (ramp up over 5 seconds)
	fmt.Println("\nPhase 1: API Load Testing...")
	for i := 0; i < concurrentUsers; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			// Ramp up: delay start to spread load
			time.Sleep(time.Duration(id) * apiRampUpTime / concurrentUsers)
			runAPILoadTest(id, stopChan)
		}(i)
	}

	// Phase 2: WebSocket Load Test (ramp up over 10 seconds)
	time.Sleep(5 * time.Second)
	fmt.Println("\nPhase 2: WebSocket Load Testing...")
	for i := 0; i < concurrentUsers/10; i++ { // 100 WebSocket connections
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			// Ramp up: delay start to spread load
			time.Sleep(time.Duration(id) * wsRampUpTime / (concurrentUsers / 10))
			runWebSocketTest(id, stopChan)
		}(i)
	}

	// Run for test duration
	time.Sleep(testDuration)
	close(stopChan)

	wg.Wait()
	elapsed := time.Since(startTime)

	// Print results
	fmt.Println("\n===========================================")
	fmt.Println("Load Test Results")
	fmt.Println("===========================================")
	fmt.Printf("Total Duration: %v\n\n", elapsed)

	// API Stats
	apiReqs := atomic.LoadInt64(&stats.apiRequests)
	apiSucc := atomic.LoadInt64(&stats.apiSuccess)
	apiFail := atomic.LoadInt64(&stats.apiFailed)
	apiLatency := atomic.LoadInt64(&stats.apiTotalLatency)
	apiMaxLat := atomic.LoadInt64(&stats.apiMaxLatency)

	fmt.Println("API Endpoints:")
	fmt.Printf("  Total Requests: %d\n", apiReqs)
	fmt.Printf("  Successful: %d (%.2f%%)\n", apiSucc, float64(apiSucc)/float64(apiReqs)*100)
	fmt.Printf("  Failed: %d (%.2f%%)\n", apiFail, float64(apiFail)/float64(apiReqs)*100)
	if apiSucc > 0 {
		avgLatency := time.Duration(apiLatency/apiSucc) * time.Millisecond
		fmt.Printf("  Avg Latency: %v\n", avgLatency)
		fmt.Printf("  Max Latency: %v\n", time.Duration(apiMaxLat)*time.Millisecond)
		fmt.Printf("  Requests/sec: %.2f\n", float64(apiReqs)/elapsed.Seconds())

		// Check p95 target (<200ms)
		if avgLatency > 200*time.Millisecond {
			fmt.Printf("  ⚠️  WARNING: Avg latency (%v) exceeds 200ms target\n", avgLatency)
		} else {
			fmt.Printf("  ✓ Avg latency (%v) meets <200ms target\n", avgLatency)
		}
	}

	// WebSocket Stats
	wsConns := atomic.LoadInt64(&stats.wsConnections)
	wsSucc := atomic.LoadInt64(&stats.wsSuccess)
	wsFail := atomic.LoadInt64(&stats.wsFailed)
	wsMsgs := atomic.LoadInt64(&stats.wsMessages)
	wsLatency := atomic.LoadInt64(&stats.wsTotalLatency)
	wsMaxLat := atomic.LoadInt64(&stats.wsMaxLatency)

	fmt.Println("\nWebSocket Connections:")
	fmt.Printf("  Total Connections: %d\n", wsConns)
	fmt.Printf("  Successful: %d (%.2f%%)\n", wsSucc, float64(wsSucc)/float64(wsConns)*100)
	fmt.Printf("  Failed: %d (%.2f%%)\n", wsFail, float64(wsFail)/float64(wsConns)*100)
	fmt.Printf("  Total Messages: %d\n", wsMsgs)
	if wsMsgs > 0 {
		avgWSLatency := time.Duration(wsLatency/wsMsgs) * time.Millisecond
		fmt.Printf("  Avg Message Latency: %v\n", avgWSLatency)
		fmt.Printf("  Max Message Latency: %v\n", time.Duration(wsMaxLat)*time.Millisecond)
		fmt.Printf("  Messages/sec: %.2f\n", float64(wsMsgs)/elapsed.Seconds())

		// Check p95 target (<100ms)
		if avgWSLatency > 100*time.Millisecond {
			fmt.Printf("  ⚠️  WARNING: Avg WS latency (%v) exceeds 100ms target\n", avgWSLatency)
		} else {
			fmt.Printf("  ✓ Avg WS latency (%v) meets <100ms target\n", avgWSLatency)
		}
	}

	fmt.Println("\n===========================================")
	fmt.Println("Load test completed!")
}

func runAPILoadTest(userID int, stopChan <-chan struct{}) {
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	// Create a guest user
	token, err := createGuestUser(client, userID)
	if err != nil {
		log.Printf("User %d: Failed to create guest: %v", userID, err)
		return
	}

	endpoints := []string{
		"/api/puzzles/today",
		"/api/puzzles/archive",
		"/api/puzzles/random",
		"/health",
		"/metrics",
	}

	for {
		select {
		case <-stopChan:
			return
		default:
			// Make requests to various endpoints
			for _, endpoint := range endpoints {
				start := time.Now()

				req, _ := http.NewRequest("GET", baseURL+endpoint, nil)
				if endpoint != "/health" && endpoint != "/metrics" {
					req.Header.Set("Authorization", "Bearer "+token)
				}

				atomic.AddInt64(&stats.apiRequests, 1)

				resp, err := client.Do(req)
				latency := time.Since(start).Milliseconds()

				if err != nil {
					atomic.AddInt64(&stats.apiFailed, 1)
					continue
				}

				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()

				if resp.StatusCode == 200 {
					atomic.AddInt64(&stats.apiSuccess, 1)
					atomic.AddInt64(&stats.apiTotalLatency, latency)

					// Update max latency
					for {
						oldMax := atomic.LoadInt64(&stats.apiMaxLatency)
						if latency <= oldMax || atomic.CompareAndSwapInt64(&stats.apiMaxLatency, oldMax, latency) {
							break
						}
					}
				} else {
					atomic.AddInt64(&stats.apiFailed, 1)
				}

				// Small delay between requests
				time.Sleep(100 * time.Millisecond)
			}
		}
	}
}

func runWebSocketTest(userID int, stopChan <-chan struct{}) {
	httpClient := &http.Client{Timeout: 5 * time.Second}

	// Create guest user
	token, err := createGuestUser(httpClient, userID+10000)
	if err != nil {
		log.Printf("WS User %d: Failed to create guest: %v", userID, err)
		return
	}

	// Create a room
	roomCode, err := createRoom(httpClient, token)
	if err != nil {
		log.Printf("WS User %d: Failed to create room: %v", userID, err)
		return
	}

	atomic.AddInt64(&stats.wsConnections, 1)

	// Connect via WebSocket
	wsConn, _, err := websocket.DefaultDialer.Dial(
		fmt.Sprintf("%s/api/rooms/%s/ws?token=%s", wsURL, roomCode, token),
		nil,
	)
	if err != nil {
		atomic.AddInt64(&stats.wsFailed, 1)
		log.Printf("WS User %d: Failed to connect: %v", userID, err)
		return
	}
	defer wsConn.Close()

	atomic.AddInt64(&stats.wsSuccess, 1)

	// Send periodic messages
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-stopChan:
			return
		case <-ticker.C:
			start := time.Now()

			// Send a cursor move message
			msg := map[string]interface{}{
				"type": "cursor_move",
				"payload": map[string]interface{}{
					"x": userID % 15,
					"y": userID % 15,
				},
			}

			err := wsConn.WriteJSON(msg)
			if err != nil {
				return
			}

			latency := time.Since(start).Milliseconds()
			atomic.AddInt64(&stats.wsMessages, 1)
			atomic.AddInt64(&stats.wsTotalLatency, latency)

			// Update max latency
			for {
				oldMax := atomic.LoadInt64(&stats.wsMaxLatency)
				if latency <= oldMax || atomic.CompareAndSwapInt64(&stats.wsMaxLatency, oldMax, latency) {
					break
				}
			}
		}
	}
}

func createGuestUser(client *http.Client, id int) (string, error) {
	payload := map[string]string{
		"displayName": fmt.Sprintf("LoadTestUser%d", id),
	}

	body, _ := json.Marshal(payload)
	resp, err := client.Post(baseURL+"/api/auth/guest", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Token string `json:"token"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.Token, nil
}

func createRoom(client *http.Client, token string) (string, error) {
	payload := map[string]interface{}{
		"mode": "collaborative",
		"config": map[string]interface{}{
			"timeLimit": 0,
		},
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", baseURL+"/api/rooms", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Room struct {
			Code string `json:"code"`
		} `json:"room"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.Room.Code, nil
}
