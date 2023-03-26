export type TsTypeString = NonNullToString<any> | ToTsTypeString<any>;

type NonNullToString<T> =
  T extends string ? 'string' :
    T extends number ? 'number' :
      T extends boolean ? 'boolean' :
        T extends number[] ? 'number[]' :
          T extends string[] ? 'string[]' :
            T extends boolean[] ? 'boolean[]' :
              never;

export type ToTsTypeString<T> =
  null extends T ? `${NonNullToString<T>} | null` : NonNullToString<T>;

export type FromTsTypeString<T> =
  T extends 'string' ? string :
    T extends 'string | null' ? string | null :
      T extends 'number' ? number :
        T extends 'number | null' ? number | null :
          T extends 'boolean' ? boolean :
            T extends 'boolean | null' ? boolean | null :
              T extends 'string[]' ? string[] :
                T extends 'string[] | null' ? string[] | null :
                  T extends 'number[]' ? number[] :
                    T extends 'number[] | null' ? number[] | null :
                      T extends 'boolean[]' ? boolean[] :
                        T extends 'boolean[] | null' ? boolean[] | null :
                          never;

export type AirtableTypeString = 'singleLineText' | 'email' | 'url' | 'multilineText' | 'phoneNumber' | 'checkbox' | 'number' | 'percent' | 'currency' | 'count' | 'autoNumber' | 'rating' | 'richText' | 'duration' | 'multipleRecordLinks';

export type FromAirtableTypeString<T> =
  T extends 'singleLineText' ? string | null :
    T extends 'email' ? string | null :
      T extends 'url' ? string | null :
        T extends 'multilineText' ? string | null :
          T extends 'richText' ? string | null :
            T extends 'phoneNumber' ? string | null :
              T extends 'checkbox' ? boolean | null :
                T extends 'number' ? number | null :
                  T extends 'percent' ? number | null :
                    T extends 'currency' ? number | null :
                      T extends 'rating' ? number | null :
                          T extends 'duration' ? number | null :
                            T extends 'count' ? number | null :
                              T extends 'autoNumber' ? number | null :
                                T extends 'multipleRecordLinks' ? string[] | null :
                                  never;
