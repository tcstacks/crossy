package realtime

import (
	"encoding/json"
	"testing"

	"github.com/crossplay/backend/internal/models"
)

func TestMessageTypes(t *testing.T) {
	// Verify all message types are distinct
	types := []MessageType{
		MsgJoinRoom, MsgLeaveRoom, MsgCellUpdate, MsgCursorMove,
		MsgSendMessage, MsgRequestHint, MsgStartGame, MsgReaction, MsgPassTurn,
		MsgRoomState, MsgPlayerJoined, MsgPlayerLeft, MsgCellUpdated,
		MsgCursorMoved, MsgNewMessage, MsgGameStarted, MsgPuzzleCompleted,
		MsgError, MsgReactionAdded, MsgRaceProgress, MsgPlayerFinished, MsgTurnChanged,
	}

	seen := make(map[MessageType]bool)
	for _, msgType := range types {
		if seen[msgType] {
			t.Errorf("duplicate message type: %s", msgType)
		}
		seen[msgType] = true
	}
}

func TestMessageSerialization(t *testing.T) {
	tests := []struct {
		name    string
		msg     Message
		wantErr bool
	}{
		{
			name: "join room message",
			msg: Message{
				Type:    MsgJoinRoom,
				Payload: json.RawMessage(`{"roomCode":"ABC123","displayName":"Player1"}`),
			},
			wantErr: false,
		},
		{
			name: "cell update message",
			msg: Message{
				Type:    MsgCellUpdate,
				Payload: json.RawMessage(`{"x":1,"y":2,"value":"A"}`),
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(tt.msg)
			if (err != nil) != tt.wantErr {
				t.Errorf("Marshal error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			var decoded Message
			err = json.Unmarshal(data, &decoded)
			if (err != nil) != tt.wantErr {
				t.Errorf("Unmarshal error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if decoded.Type != tt.msg.Type {
				t.Errorf("Type = %s, want %s", decoded.Type, tt.msg.Type)
			}
		})
	}
}

func TestPayloadSerialization(t *testing.T) {
	t.Run("JoinRoomPayload", func(t *testing.T) {
		payload := JoinRoomPayload{
			RoomCode:    "ABC123",
			DisplayName: "TestPlayer",
			IsSpectator: false,
		}
		data, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("Marshal error: %v", err)
		}

		var decoded JoinRoomPayload
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("Unmarshal error: %v", err)
		}

		if decoded.RoomCode != payload.RoomCode {
			t.Errorf("RoomCode = %s, want %s", decoded.RoomCode, payload.RoomCode)
		}
	})

	t.Run("CellUpdatePayload", func(t *testing.T) {
		value := "A"
		payload := CellUpdatePayload{
			X:     5,
			Y:     3,
			Value: &value,
		}
		data, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("Marshal error: %v", err)
		}

		var decoded CellUpdatePayload
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("Unmarshal error: %v", err)
		}

		if decoded.X != payload.X || decoded.Y != payload.Y {
			t.Errorf("Position = (%d,%d), want (%d,%d)", decoded.X, decoded.Y, payload.X, payload.Y)
		}
		if decoded.Value == nil || *decoded.Value != value {
			t.Errorf("Value = %v, want %s", decoded.Value, value)
		}
	})

	t.Run("RaceProgressPayload", func(t *testing.T) {
		payload := RaceProgressPayload{
			Leaderboard: []models.RaceProgress{
				{UserID: "user1", DisplayName: "Player1", Progress: 75.5},
				{UserID: "user2", DisplayName: "Player2", Progress: 50.0},
			},
		}
		data, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("Marshal error: %v", err)
		}

		var decoded RaceProgressPayload
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("Unmarshal error: %v", err)
		}

		if len(decoded.Leaderboard) != 2 {
			t.Errorf("Leaderboard length = %d, want 2", len(decoded.Leaderboard))
		}
	})

	t.Run("TurnChangedPayload", func(t *testing.T) {
		payload := TurnChangedPayload{
			CurrentPlayerID:   "user123",
			CurrentPlayerName: "TestPlayer",
			TurnNumber:        5,
		}
		data, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("Marshal error: %v", err)
		}

		var decoded TurnChangedPayload
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("Unmarshal error: %v", err)
		}

		if decoded.TurnNumber != 5 {
			t.Errorf("TurnNumber = %d, want 5", decoded.TurnNumber)
		}
	})
}

func TestFindPlayer(t *testing.T) {
	players := []models.Player{
		{UserID: "user1", DisplayName: "Player1"},
		{UserID: "user2", DisplayName: "Player2"},
		{UserID: "user3", DisplayName: "Player3"},
	}

	tests := []struct {
		name   string
		userID string
		want   string
	}{
		{"find first", "user1", "Player1"},
		{"find middle", "user2", "Player2"},
		{"find last", "user3", "Player3"},
		{"not found", "user999", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			player := findPlayer(players, tt.userID)
			if tt.want == "" {
				if player != nil {
					t.Errorf("findPlayer() = %v, want nil", player)
				}
			} else {
				if player == nil {
					t.Error("findPlayer() = nil, want non-nil")
				} else if player.DisplayName != tt.want {
					t.Errorf("findPlayer() DisplayName = %s, want %s", player.DisplayName, tt.want)
				}
			}
		})
	}
}

func TestRoomModes(t *testing.T) {
	modes := []models.RoomMode{
		models.RoomModeCollaborative,
		models.RoomModeRace,
		models.RoomModeRelay,
	}

	seen := make(map[models.RoomMode]bool)
	for _, mode := range modes {
		if seen[mode] {
			t.Errorf("duplicate room mode: %s", mode)
		}
		seen[mode] = true

		if mode == "" {
			t.Error("empty room mode")
		}
	}
}
