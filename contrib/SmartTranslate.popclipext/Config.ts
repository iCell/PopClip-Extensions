// #popclip
// name: Smart Translate
// icon: openai-icon.svg
// identifier: io.icell.SmartTranslate.PopClipExtension
// description: Send the selected text to OpenAI's API, if it’s an English statement, will convert them to standard English, if it’s a Chinese statement, will translate them into standard English..
// app: { name: Smart Translate, link: 'https://platform.openai.com/docs/api-reference/chat' }
// popclipVersion: 4586
// keywords: openai chatgpt translate
// entitlements: [network]

import axios from "axios";
import langsJson from './languages.json';

interface Language {
    name: string;
}

interface LangsJson {
    langs: Language[];
}

interface Result {
    names: string[];
}

const languageList = (): Result => {
    const { langs } = langsJson as LangsJson;
    langs.sort((a, b) => a.name.localeCompare(b.name));

    const result: Result = { names: [] };
    for (const lang of langs) {
        result.names.push(lang.name);
    }

    return result;
};

const { names } = languageList();

export const options = [
    {
        identifier: "apikey",
        label: "API Key",
        type: "secret",
        description:
            "Obtain an API key from: https://platform.openai.com/account/api-keys",
    },
    {
        identifier: "model",
        label: "Model",
        type: "multiple",
        defaultValue: "gpt-4o",
        values: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"],
    },
    {
        identifier: 'fromLang',
        label: 'Translate From',
        type: 'multiple',
        values: names,
        defaultValue: 'Chinese',
        description: "The language for translation."
    },
    {
        identifier: 'tolang',
        label: 'Translate To',
        type: 'multiple',
        values: names,
        defaultValue: 'English',
        description: "Target language, or the language to be optimized."
    }
] as const;

type Options = InferOptions<typeof options>;

// typescript interfaces for OpenAI API
interface Message {
    role: "user" | "system" | "assistant";
    content: string;
}
interface ResponseData {
    choices: [{ message: Message }];
}
interface Response {
    data: ResponseData;
}

// the main chat action
const smartTranslate: ActionFunction<Options> = async (input, options) => {
    const prompt = `You will be provided with statements, if it’s an ${options.tolang} statement, your task is to convert them to standard ${options.tolang}, if it’s a ${options.fromLang} statement, your task is to translate them into standard ${options.tolang}.`

    const openai = axios.create({
        baseURL: `https://api.openai.com/v1`,
        headers: { Authorization: `Bearer ${options.apikey}` },
    });

    const messages: Array<Message> = [
        { role: "system", content: prompt },
        { role: "user", content: input.text.trim() }
    ];

    try {
        const { data }: Response = await openai.post("/chat/completions", {
            model: options.model || "gpt-4o",
            messages,
        });

        const resp = data.choices[0].message.content

        // if holding shift and option, paste just the response.
        // if holding shift, copy just the response.
        // else, paste the last input and response.
        if (popclip.modifiers.shift && popclip.modifiers.option) {
            popclip.pasteText(resp);
        } else if (popclip.modifiers.shift) {
            popclip.copyText(resp);
        } else {
            popclip.pasteText(resp);
            popclip.showSuccess();
        }
    } catch (e) {
        popclip.showText(getErrorInfo(e));
    }
};

export function getErrorInfo(error: unknown): string {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as any).response;
        return `Message from OpenAI (code ${response.status}): ${response.data.error.message}`;
    } else {
        return String(error);
    }
}

// export the actions
export const actions: Action<Options>[] = [
    {
        title: "Translate",
        code: smartTranslate,
    }
];
