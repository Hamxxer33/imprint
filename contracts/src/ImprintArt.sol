// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Base64} from "./Base64.sol";

/// @notice On-chain SVG + OpenSea metadata for an Imprint passport.
library ImprintArt {
    function tokenURI(uint256 id, bytes32 traits, string memory handle) internal pure returns (string memory) {
        string memory image = Base64.encode(bytes(svg(id, traits, handle)));
        string memory json = string.concat(
            '{"name":"Imprint #',
            _u(id),
            '","description":"',
            typeName(traits),
            " - a 1/1 imprint of ",
            handle,
            "'s Base wallet. Rarity ",
            rarityName(traits),
            '. Passport other contracts can read.","image":"data:image/svg+xml;base64,',
            image,
            '","attributes":',
            attributes(traits, handle),
            "}"
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function svg(uint256 id, bytes32 traits, string memory handle) internal pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">',
            '<rect width="800" height="800" fill="#FFFFFF"/>',
            '<text x="84" y="48" fill="#0C0E12" font-family="sans-serif" font-size="20" font-weight="700">IMPRINT</text>',
            '<text x="716" y="48" text-anchor="end" fill="#5A6070" font-family="monospace" font-size="18">#',
            _pad(id),
            "</text>",
            '<text x="84" y="78" fill="#0C0E12" font-family="sans-serif" font-size="18" font-weight="700">',
            _up(typeName(traits)),
            "</text>",
            '<text x="716" y="78" text-anchor="end" fill="',
            rarityColor(traits),
            '" font-family="sans-serif" font-size="14">',
            _up(rarityName(traits)),
            "</text>",
            '<text x="84" y="102" fill="#8C92A0" font-family="monospace" font-size="13">',
            handle,
            "</text>",
            '<text x="716" y="102" text-anchor="end" fill="#8C92A0" font-family="monospace" font-size="13">BASE</text>',
            _plate(traits, 0, "#00B5E2", 84, 128),
            _plate(traits, 1, "#E6007A", 428, 128),
            _plate(traits, 2, "#F0BA00", 84, 472),
            _plate(traits, 3, "#111216", 428, 472),
            "</svg>"
        );
    }

    function attributes(bytes32 t, string memory handle) internal pure returns (string memory) {
        return string.concat(
            "[",
            _attr("Type", typeName(t)),
            ",",
            _attr("Rarity", rarityName(t)),
            ",",
            _attr("Handle", handle),
            ",",
            _attr("Network", _label(1, _band(uint8(t[1])))),
            ",",
            _attr("Activity", _label(2, _band(uint8(t[2])))),
            ",",
            _attr("Heat", _label(3, _band(uint8(t[3])))),
            ",",
            _attr("Native", _label(4, _band(uint8(t[4])))),
            ",",
            _attr("Bags", _label(5, _band(uint8(t[5])))),
            ",",
            _attr("Vintage", _label(0, _band(uint8(t[0])))),
            ",",
            _attr("Named", _label(6, _band(uint8(t[6])))),
            ',{"trait_type":"Rarity Score","display_type":"number","value":',
            _u(rarityScore(t)),
            "}]"
        );
    }

    function typeName(bytes32 t) internal pure returns (string memory) {
        uint8[6] memory s =
            [uint8(t[0]), uint8(t[1]), uint8(t[2]), uint8(t[3]), uint8(t[4]), uint8(t[5])];
        uint8 i0 = 0;
        for (uint8 i = 1; i < 6; i++) {
            if (s[i] > s[i0]) i0 = i;
        }
        uint8 i1 = i0 == 0 ? 1 : 0;
        for (uint8 i = 0; i < 6; i++) {
            if (i == i0) continue;
            if (s[i] > s[i1]) i1 = i;
        }
        string memory a = _label(i0, _band(s[i0]));
        string memory b = _label(i1, _band(s[i1]));
        if (keccak256(bytes(a)) == keccak256(bytes(b))) {
            uint8 i2 = 0;
            while (i2 == i0 || i2 == i1) i2++;
            for (uint8 i = 0; i < 6; i++) {
                if (i == i0 || i == i1) continue;
                if (s[i] > s[i2]) i2 = i;
            }
            b = _label(i2, _band(s[i2]));
        }
        return string.concat(a, " ", b);
    }

    function rarityScore(bytes32 t) internal pure returns (uint256) {
        uint256 v0 = uint8(t[0]);
        uint256 v1 = uint8(t[1]);
        uint256 v2 = uint8(t[2]);
        uint256 v3 = uint8(t[3]);
        uint256 v4 = uint8(t[4]);
        uint256 v5 = uint8(t[5]);
        uint256 mean = (v0 + v1 + v2 + v3 + v4 + v5) / 6;
        uint256 peak = v0;
        if (v1 > peak) peak = v1;
        if (v2 > peak) peak = v2;
        if (v3 > peak) peak = v3;
        if (v4 > peak) peak = v4;
        if (v5 > peak) peak = v5;
        uint256 low = v0;
        if (v1 < low) low = v1;
        if (v2 < low) low = v2;
        if (v3 < low) low = v3;
        if (v4 < low) low = v4;
        if (v5 < low) low = v5;
        uint256 named = uint8(t[6]) >= 200 ? 12 : 0;
        uint256 score = mean / 2 + peak / 3 + (peak - low) / 8 + named;
        if (score > 255) score = 255;
        return score;
    }

    function rarityName(bytes32 t) internal pure returns (string memory) {
        uint256 s = rarityScore(t);
        if (s < 70) return "Common";
        if (s < 110) return "Uncommon";
        if (s < 150) return "Rare";
        if (s < 190) return "Epic";
        return "Legendary";
    }

    function rarityColor(bytes32 t) internal pure returns (string memory) {
        uint256 s = rarityScore(t);
        if (s < 70) return "#8C92A0";
        if (s < 110) return "#2EA05A";
        if (s < 150) return "#007ACC";
        if (s < 190) return "#8C46DC";
        return "#C88C14";
    }

    function _plate(bytes32 traits, uint8 plate, string memory color, uint256 ox, uint256 oy)
        private
        pure
        returns (string memory)
    {
        uint256 score;
        if (plate == 0) score = uint8(traits[1]);
        else if (plate == 1) score = uint8(traits[2]);
        else if (plate == 2) score = uint8(traits[3]);
        else score = (uint256(uint8(traits[0])) + uint256(uint8(traits[4]))) / 2;
        uint256 threshold = 24 + (score * 216) / 255;
        uint256 cell = 36;
        uint256 gap = 2;
        string memory out;
        for (uint256 y; y < 8; y++) {
            for (uint256 x; x < 8; x++) {
                uint256 h = uint256(keccak256(abi.encodePacked(traits, plate, uint8(x), uint8(y))));
                string memory fill = uint8(h) < threshold ? color : "#ECEEF2";
                uint256 x0 = ox + x * (cell + gap);
                uint256 y0 = oy + y * (cell + gap);
                out = string.concat(
                    out,
                    '<rect x="',
                    _u(x0),
                    '" y="',
                    _u(y0),
                    '" width="36" height="36" rx="3" fill="',
                    fill,
                    '"/>'
                );
            }
        }
        return out;
    }

    function _band(uint8 v) private pure returns (uint8) {
        if (v < 52) return 0;
        if (v < 103) return 1;
        if (v < 154) return 2;
        if (v < 205) return 3;
        return 4;
    }

    function _label(uint8 dim, uint8 b) private pure returns (string memory) {
        if (dim == 0) {
            if (b == 0) return "New";
            if (b == 1) return "Young";
            if (b == 2) return "Settled";
            if (b == 3) return "Veteran";
            return "OG";
        }
        if (dim == 1) {
            if (b == 0) return "Ghost";
            if (b == 1) return "Micro";
            if (b == 2) return "Connected";
            if (b == 3) return "Loud";
            return "Hub";
        }
        if (dim == 2) {
            if (b == 0) return "Mute";
            if (b == 1) return "Quiet";
            if (b == 2) return "Active";
            if (b == 3) return "Machine";
            return "Relentless";
        }
        if (dim == 3) {
            if (b == 0) return "Cold";
            if (b == 1) return "Warm";
            if (b == 2) return "Hot";
            if (b == 3) return "Blazing";
            return "Viral";
        }
        if (dim == 4) {
            if (b == 0) return "Fresh";
            if (b == 1) return "Settler";
            if (b == 2) return "Native";
            if (b == 3) return "Elder";
            return "Ancient";
        }
        if (dim == 5) {
            if (b == 0) return "Thin";
            if (b == 1) return "Funded";
            if (b == 2) return "Stacked";
            if (b == 3) return "Heavy";
            return "Whale";
        }
        if (b < 2) return "Anon";
        if (b < 4) return "Named";
        return "Basename";
    }

    function _attr(string memory k, string memory v) private pure returns (string memory) {
        return string.concat('{"trait_type":"', k, '","value":"', v, '"}');
    }

    function _u(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _pad(uint256 id) private pure returns (string memory) {
        string memory s = _u(id);
        if (id >= 1000) return s;
        if (id >= 100) return string.concat("0", s);
        if (id >= 10) return string.concat("00", s);
        return string.concat("000", s);
    }

    function _up(string memory s) private pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint256 i; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 97 && c <= 122) b[i] = bytes1(c - 32);
        }
        return string(b);
    }
}
