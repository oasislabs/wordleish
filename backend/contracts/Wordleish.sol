// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

contract Wordleish {
    using Counters for Counters.Counter;

    uint256 private constant CHAR_USED = 0xff;
    uint256 private constant WORD_LEN = 5;

    type GameId is uint256;
    type Word is uint256;
    type LetterMask is uint256;

    enum LetterMatch {
        Missing,
        Present,
        Correct
    }

    struct Solvers {
        address firstSolver;
        uint256 numSolves;
    }

    event GameStarted(GameId gameId);
    event GameSolved(GameId indexed gameId);

    Counters.Counter public nextGameId;

    mapping(GameId => Word) private games;
    mapping(GameId => Solvers) public solvers;

    modifier validWord(Word _word) {
        for (uint256 i; i < WORD_LEN; ++i) {
            uint256 char = _getChar(_word, i);
            require(char != 0, "wrong word length");
            require(char >= 0x61 && char <= 0x7a, "found invalid letter");
        }
        require(_getChar(_word, WORD_LEN) == 0, "wrong word length");
        _;
    }

    function startGame(Word _word) external validWord(_word) returns (GameId gameId) {
        gameId = GameId.wrap(nextGameId.current());
        nextGameId.increment();
        games[gameId] = _word;
        emit GameStarted(gameId);
    }

    function guess(GameId _gameId, Word _guess) external validWord(_guess) returns (LetterMask) {
        Word word = games[_gameId];
        LetterMask matches;
        bool correct = true;
        // First, pick all of the correct letters so that they're not stolen by mispositioned ones.
        for (uint256 i; i < WORD_LEN; ++i) {
            if (_getChar(word, i) != _getChar(_guess, i)) {
                correct = false;
                continue;
            }
            word = _markCharUsed(word, i); // mark the character as used
            _guess = _markCharUsed(_guess, i); // mark the character as matched
            matches = _setMask(matches, i, LetterMatch.Correct);
        }
        if (correct) {
            Solvers storage solves = solvers[_gameId];
            if (solves.firstSolver == address(0)) {
                solves.firstSolver = msg.sender;
            }
            solves.numSolves += 1;
            emit GameSolved(_gameId);
            return matches;
        }
        // Next, find all the mispositioned letters.
        for (uint256 i; i < WORD_LEN; ++i) {
            uint256 guessChar = _getChar(_guess, i);
            if (guessChar == CHAR_USED) continue;
            for (uint256 j; j < WORD_LEN; ++j) {
                if (i == j || guessChar != _getChar(word, j)) continue;
                matches = _setMask(matches, i, LetterMatch.Present);
                word = _markCharUsed(word, j); // mark the character as used
                break;
            }
        }
        return matches;
    }

    function _getChar(Word _word, uint256 _ix) internal pure returns (uint256) {
        return (Word.unwrap(_word) >> ((31 - _ix) * 8)) & 0xff;
    }

    function _markCharUsed(Word _word, uint256 _ix) internal pure returns (Word) {
        return Word.wrap(_setByte(Word.unwrap(_word), _ix, CHAR_USED));
    }

    function _setMask(
        LetterMask _mask,
        uint256 _ix,
        LetterMatch _value
    ) internal pure returns (LetterMask) {
        return LetterMask.wrap(_setByte(LetterMask.unwrap(_mask), _ix, uint256(_value)));
    }

    function _setByte(
        uint256 _bytes,
        uint256 _ix,
        uint256 _value
    ) internal pure returns (uint256) {
        uint256 shift = (31 - _ix) * 8;
        _bytes &= ~(0xff << shift);
        _bytes |= _value << shift;
        return _bytes;
    }
}
