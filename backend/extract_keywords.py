from multi_rake import Rake

rake = Rake()

def extract_keywords(text):
    keywords = rake.apply(text)
    return [keyword[0] for keyword in keywords]  # Only return the keywords
