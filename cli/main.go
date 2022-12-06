//go:generate abigen --abi ../backend/abis/Wordleish.json --pkg main --out wordleish.go --type wordleish

package main

import (
	"crypto/ecdsa"
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/fatih/color"
	sapphire "github.com/oasisprotocol/sapphire-paratime/clients/go"
)

type LetterMatch int

const (
	Missing LetterMatch = iota
	Present
	Correct
)

//go:generate cp ../frontend/src/dictionary.json dictionary.json
//go:embed dictionary.json
var dictJson []byte

func main() {
	log.SetFlags(0)
	log.SetPrefix(color.New(color.FgRed).Sprint("Error: "))

	chainID := uint64(0x5aff)
	net := sapphire.Networks[chainID]

	keyHex := os.Getenv("PRIVATE_KEY")
	if len(keyHex) == 0 {
		log.Fatalf("PRIVATE_KEY environment variable not set.")
	}
	key, err := crypto.HexToECDSA(strings.TrimPrefix(keyHex, "0x"))
	if err != nil {
		log.Fatalf("failed to parse private key: %v", err)
	}
	publicKey := key.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Fatal("provided invalid PRIVATE KEY")
	}
	sender := crypto.PubkeyToAddress(*publicKeyECDSA)
	fmt.Printf("Connected as %s.\n", color.New(color.FgGreen).Sprint(sender.Hex()))

	conn, err := ethclient.Dial(net.DefaultGateway)
	if err != nil {
		log.Fatalf("failed to dial the Sapphire gateway: %v", err)
	}
	backend, err := sapphire.WrapClient(*conn, func(digest [32]byte) ([]byte, error) {
		return crypto.Sign(digest[:], key)
	})
	if err != nil {
		log.Fatalf("failed to wrap backend: %v", err)
	}

	wordleishAddr := common.HexToAddress("0x40b81e081b1aF09875a07376bdAD27507774e9a3")
	abi, err := WordleishMetaData.GetAbi()
	if err != nil {
		panic(err)
	}
	wc := bind.NewBoundContract(wordleishAddr, *abi, backend, nil, nil)
	w, err := NewWordleish(wordleishAddr, backend)
	if err != nil {
		log.Fatalf("failed to connect to Wordleish contract: %v", err)
	}

	nextGameId, err := w.NextGameId(nil)
	if err != nil {
		log.Fatalf("failed to get next game ID: %v", err)
	}
	fmt.Printf("There are currently %s puzzles available.\n", color.New(color.FgYellow).Sprint(nextGameId.Uint64()))
	var gameNr uint64
	for ; gameNr == 0 || gameNr > nextGameId.Uint64(); fmt.Scanf("%d", &gameNr) {
		fmt.Print("Which puzzle number do you want to play? ")
	}
	gameId := big.NewInt(int64(gameNr - 1))

	var dictWords []string
	if err = json.Unmarshal(dictJson, &dictWords); err != nil {
		panic(err)
	}
	dict := make(map[string]struct{})
	for _, word := range dictWords {
		dict[word] = struct{}{}
	}

	var guess string
	for {
		for {
			fmt.Print("Guess: ")
			fmt.Scanln(&guess)
			if _, isWord := dict[guess]; isWord {
				break
			}
		}
		matches, err := makeGuess(wc, gameId, guess)
		if err != nil {
			log.Fatalf("failed to make guess: %v", err)
		}
		printMatches(guess, matches)
		correct := true
		for _, w := range matches {
			correct = correct && w == Correct
		}
		if correct {
			break
		}
	}
	txOpts := backend.Transactor(sender)
	tx, err := w.Guess(txOpts, gameId, packWord(guess))
	if err != nil {
		log.Fatalf("failed to post winning submission: %v", err)
	}
	fmt.Println("🎉", tx.Hash(), "🎉")
}

func makeGuess(c *bind.BoundContract, gameId *big.Int, word string) ([5]LetterMatch, error) {
	var out []interface{}
	if err := c.Call(nil, &out, "guess", gameId, packWord(word)); err != nil {
		return [5]LetterMatch{}, err
	}
	iLetterMask := abi.ConvertType(out[0], new(*big.Int)).(**big.Int)
	return unpackMask(*iLetterMask), nil
}

func packWord(word string) *big.Int {
	chars := *(*[5]byte)([]byte(strings.ToLower(word)))
	iword := uint64(0)
	for i, v := range chars {
		iword |= uint64(v) << ((7 - i) * 8)
	}
	bword := big.NewInt(int64(iword))
	return bword.Lsh(bword, 256-64)
}

func unpackMask(mask *big.Int) [5]LetterMatch {
	imask := mask.Rsh(mask, 256-64).Uint64()
	matches := [5]LetterMatch{}
	for i := range matches {
		matches[i] = LetterMatch((imask >> ((7 - i) * 8)) & 0xff)
	}
	return matches
}

func printMatches(word string, matches [5]LetterMatch) {
	s := ""
	for i := range matches {
		ch := string(word[i])
		match := matches[i]
		if match == Missing {
			s = s + color.New(color.FgHiBlack, color.BgWhite).Sprint(ch)
		} else if match == Present {
			s = s + color.New(color.FgHiBlack, color.BgHiYellow).Sprint(ch)
		} else {
			s = s + color.New(color.FgHiBlack, color.BgHiGreen).Sprint(ch)
		}
	}
	fmt.Println(s)
}
