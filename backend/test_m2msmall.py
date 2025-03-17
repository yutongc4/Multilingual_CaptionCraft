from transformers import M2M100ForConditionalGeneration
from tokenization_small100 import SMALL100Tokenizer

hi_text = "जीवन एक चॉकलेट बॉक्स की तरह है।"
chinese_text = "生活就像一盒巧克力。"
en_text = "I am an artist"

model = M2M100ForConditionalGeneration.from_pretrained("alirezamsh/small100")
tokenizer = SMALL100Tokenizer.from_pretrained("alirezamsh/small100")

# translate Hindi to French
tokenizer.tgt_lang = "fr"
encoded_hi = tokenizer(hi_text, return_tensors="pt")
generated_tokens = model.generate(**encoded_hi)
print(tokenizer.batch_decode(generated_tokens, skip_special_tokens=True))
# => "La vie est comme une boîte de chocolat."

# translate Chinese to English
tokenizer.tgt_lang = "en"
encoded_zh = tokenizer(chinese_text, return_tensors="pt")
generated_tokens = model.generate(**encoded_zh)
print(tokenizer.batch_decode(generated_tokens, skip_special_tokens=True))
# => "Life is like a box of chocolate."

# translate English to French
tokenizer.tgt_lang = "fr"
encoded_en = tokenizer(en_text, return_tensors="pt")
generated_tokens = model.generate(**encoded_en)
print(tokenizer.batch_decode(generated_tokens, skip_special_tokens=True))
# => "Je suis un artiste."