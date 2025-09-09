import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Image,
  Text,
  Badge,
  HStack,
  VStack,
  Divider,
  Grid,
  GridItem,
  Button,
  Link,
  Tooltip,
  Progress,
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import { ExternalLinkIcon, StarIcon, CalendarIcon, TimeIcon } from '@chakra-ui/icons';
import { ContentItem } from '../../types/content';

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContentItem | null;
}

const ContentModal: React.FC<ContentModalProps> = ({ isOpen, onClose, content }) => {
  if (!content) return null;

  const getQualityColor = (quality: string) => {
    switch (quality?.toLowerCase()) {
      case '4k':
      case 'uhd': return 'purple';
      case 'fhd':
      case '1080p': return 'blue';
      case 'hd':
      case '720p': return 'green';
      case 'sd':
      case '480p': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Text>{content.title}</Text>
            <Badge colorScheme={getQualityColor(content.quality)}>
              {content.quality || 'SD'}
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Grid templateColumns="300px 1fr" gap={6}>
            {/* Poster and basic info */}
            <GridItem>
              <VStack align="stretch" spacing={4}>
                <Image
                  src={content.posterUrl || '/placeholder-poster.jpg'}
                  alt={content.title}
                  borderRadius="lg"
                  fallbackSrc="/placeholder-poster.jpg"
                />
                
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Rating:</Text>
                    <HStack>
                      <StarIcon color="yellow.400" />
                      <Text>{content.rating ? content.rating.toFixed(1) : 'N/A'}</Text>
                    </HStack>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Año:</Text>
                    <HStack>
                      <CalendarIcon color="gray.400" />
                      <Text>{content.year || 'N/A'}</Text>
                    </HStack>
                  </HStack>
                  
                  {content.runtime && (
                    <HStack justify="space-between">
                      <Text fontWeight="semibold">Duración:</Text>
                      <HStack>
                        <TimeIcon color="gray.400" />
                        <Text>{content.runtime} min</Text>
                      </HStack>
                    </HStack>
                  )}
                  
                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Idioma:</Text>
                    <Text>{content.language || 'N/A'}</Text>
                  </HStack>
                  
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Confianza:</Text>
                    <Tooltip label={`${(content.confidence * 100).toFixed(1)}%`}>
                      <Progress
                        value={content.confidence * 100}
                        colorScheme={content.confidence >= 0.8 ? 'green' : content.confidence >= 0.6 ? 'yellow' : 'red'}
                        borderRadius="md"
                      />
                    </Tooltip>
                  </Box>
                </VStack>
              </VStack>
            </GridItem>
            
            {/* Detailed info */}
            <GridItem>
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontWeight="semibold" mb={2}>Título Original:</Text>
                  <Text color="gray.600">{content.originalTitle}</Text>
                </Box>
                
                {content.plot && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Sinopsis:</Text>
                    <Text>{content.plot}</Text>
                  </Box>
                )}
                
                {content.genre && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Géneros:</Text>
                    <Wrap>
                      {content.genre.split(',').map((genre, index) => (
                        <WrapItem key={index}>
                          <Badge colorScheme="blue">{genre.trim()}</Badge>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}
                
                {content.director && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Director:</Text>
                    <Text>{content.director}</Text>
                  </Box>
                )}
                
                {content.actors && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Actores:</Text>
                    <Text>{content.actors}</Text>
                  </Box>
                )}
                
                {content.type === 'series' && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Episodio:</Text>
                    <Text>
                      Temporada {content.season}, Episodio {content.episode}
                    </Text>
                  </Box>
                )}
                
                <Divider />
                
                <Box>
                  <Text fontWeight="semibold" mb={2}>Enlaces Externos:</Text>
                  <VStack align="start" spacing={2}>
                    {content.tmdbId && (
                      <Link
                        href={`https://www.themoviedb.org/${content.type === 'movie' ? 'movie' : 'tv'}/${content.tmdbId}`}
                        isExternal
                        color="blue.500"
                      >
                        Ver en TMDB <ExternalLinkIcon mx="2px" />
                      </Link>
                    )}
                    {content.imdbId && (
                      <Link
                        href={`https://www.imdb.com/title/${content.imdbId}`}
                        isExternal
                        color="yellow.600"
                      >
                        Ver en IMDB <ExternalLinkIcon mx="2px" />
                      </Link>
                    )}
                  </VStack>
                </Box>
                
                <Divider />
                
                <Box>
                  <Text fontWeight="semibold" mb={2}>Información Técnica:</Text>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.600">
                      <strong>URL:</strong> {content.url}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      <strong>Fuente:</strong> {content.sourceName}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      <strong>Última actualización:</strong> {new Date(content.updatedAt).toLocaleString()}
                    </Text>
                  </VStack>
                </Box>
              </VStack>
            </GridItem>
          </Grid>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ContentModal;