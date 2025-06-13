/**
 * Gets enum key by value (equivalent to Python's get_enum_key_by_value)
 */
export function getEnumKeyByValue(enumObject: any, value: number): string | null {
    const keys = Object.keys(enumObject).filter(
        key => typeof enumObject[key] === 'number' && enumObject[key] === value
    );
    return keys.length > 0 ? keys[0] : null;
} 