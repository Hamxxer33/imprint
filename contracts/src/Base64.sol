// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library Base64 {
    bytes internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        uint256 len = data.length;
        bytes memory table = TABLE;
        bytes memory result = new bytes(4 * ((len + 2) / 3));
        uint256 i;
        uint256 j;
        while (i < len) {
            uint256 a = uint8(data[i]);
            uint256 b = i + 1 < len ? uint8(data[i + 1]) : 0;
            uint256 c = i + 2 < len ? uint8(data[i + 2]) : 0;
            uint256 triple = (a << 16) | (b << 8) | c;
            result[j] = table[(triple >> 18) & 63];
            result[j + 1] = table[(triple >> 12) & 63];
            result[j + 2] = i + 1 < len ? table[(triple >> 6) & 63] : bytes1(0x3d);
            result[j + 3] = i + 2 < len ? table[triple & 63] : bytes1(0x3d);
            i += 3;
            j += 4;
        }
        return string(result);
    }
}
